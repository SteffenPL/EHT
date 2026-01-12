# Implementation Plan: URL-Based Parameter Sharing

## Overview

Add the ability to share simulation configurations via URL, enabling:
1. "Run" buttons in the statistics results table that open simulations with specific parameters
2. Shareable links that encode model + parameters in the URL
3. A "Copy Share Link" button in the Parameters panel

## Design Decisions

### URL Encoding Strategy

**Approach: Full Parameters with Compressed TOML**
- Encode the **full** TOML config (not minimal) as compressed base64
- Use pako/deflate compression to keep URLs manageable
- Example: `?model=eht&config=<compressed-base64>`

**Why full params instead of minimal diffs:**
- Defaults may change between versions
- Links should be stable and reproducible regardless of codebase updates
- A link shared today should produce the same simulation in 6 months

**Compression strategy:**
- Use `pako.deflate()` for compression (widely used, good ratio)
- Base64 encode the compressed bytes
- Typical compression: 60-80% reduction for TOML text

### URL Format

```
https://domain.com/?model=eht&config=<compressed-base64-full-toml>
```

Components:
- `model`: Model name (required if config provided)
- `config`: Compressed base64-encoded full TOML

### URL Length Considerations

- Max safe URL length: ~2000 characters
- Full EHT TOML: ~2000-3000 chars uncompressed
- After deflate: ~400-800 chars
- After base64: ~550-1100 chars → Within limits for most configs

## Implementation Steps

### Step 1: URL Encoding/Decoding Utilities

Create `src/core/params/url.ts`:

```typescript
import pako from 'pako';

/**
 * Encode params to URL-safe format.
 * Uses full params (not minimal) for stability across version changes.
 * Compresses with deflate to keep URLs manageable.
 */
export function encodeParamsToUrl(
  modelName: string,
  params: SimulationParams
): string {
  const tomlString = toToml(params);
  const compressed = pako.deflate(tomlString);
  const base64 = btoa(String.fromCharCode(...compressed));
  // Make URL-safe: replace + with -, / with _, remove padding =
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('model', modelName);
  url.searchParams.set('config', urlSafe);
  return url.toString();
}

/**
 * Decode params from URL.
 * Returns model name and full params.
 */
export function decodeParamsFromUrl(): {
  modelName: string;
  params: SimulationParams;
} | null {
  const url = new URL(window.location.href);
  const modelName = url.searchParams.get('model');
  const config = url.searchParams.get('config');

  if (!modelName || !config) return null;

  try {
    // Restore base64 from URL-safe format
    let base64 = config.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) base64 += '=';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const tomlString = pako.inflate(bytes, { to: 'string' });
    const params = parseTomlWithDefaults(tomlString);
    return { modelName, params };
  } catch (e) {
    console.error('Failed to decode URL params:', e);
    return null;
  }
}

/**
 * Clear params from URL without page reload.
 */
export function clearUrlParams(): void {
  const url = new URL(window.location.origin + window.location.pathname);
  window.history.replaceState({}, '', url.toString());
}
```

### Step 2: Update App.tsx to Read URL on Load

Modify `AppContent` to:
1. Check for URL params on mount
2. If present, set the model and params
3. Clear URL params after loading (to prevent stale state on refresh)

```typescript
function AppContent() {
  const { currentModel, currentParams, setParams, setModel } = useModel();

  // Load params from URL on mount
  useEffect(() => {
    const urlData = decodeParamsFromUrl();
    if (urlData?.modelName && urlData?.params) {
      setModel(urlData.modelName);
      // Need to wait for model to load, then merge params
      const model = modelRegistry.get(urlData.modelName);
      if (model) {
        const merged = mergeWithDefaults(urlData.params);
        setParams(merged);
      }
      clearUrlParams();
    }
  }, []);

  // ... rest of component
}
```

### Step 3: Add "Copy Share Link" Button to ParameterConfigView

In `src/components/params/ParameterConfigView.tsx`:

```typescript
import { Link2 } from 'lucide-react';
import { encodeParamsToUrl } from '@/core/params/url';
import { useMessages } from '@/contexts/MessagesContext';

// In the component:
const { showMessage } = useMessages();

const handleCopyShareLink = () => {
  const url = encodeParamsToUrl(currentModel.name, config.params);
  navigator.clipboard.writeText(url);
  showMessage('Share link copied to clipboard', 'success');
};

// Add button next to export:
<Button variant="outline" size="sm" onClick={handleCopyShareLink}>
  <Link2 className="h-4 w-4 mr-1" />
  Copy Share Link
</Button>
```

### Step 4: Add "Run" Column to ResultsTable

Modify `ResultsTable` to accept an optional callback for row actions:

```typescript
export interface ResultsTableProps {
  columns: string[];
  rows: (string | number)[][];
  onRunRow?: (rowIndex: number) => void;  // New optional prop
}

export function ResultsTable({ columns, rows, onRunRow }: ResultsTableProps) {
  // Add "Run" column at the start if callback provided
  const showRunColumn = !!onRunRow;

  return (
    <table>
      <thead>
        <tr>
          {showRunColumn && <th>Run</th>}
          {columns.map(...)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {showRunColumn && (
              <td>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRunRow(rowIdx)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </td>
            )}
            {row.map(...)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Step 5: Implement Row-to-Params Conversion in BatchTab

In `BatchTab.tsx`, add logic to:
1. Extract the parameter values from a results row
2. Construct the full params by applying the sampled values
3. Generate and open the share URL

```typescript
// Store parameter paths alongside results for reconstruction
const [paramPaths, setParamPaths] = useState<string[]>([]);

// In handleComputeStats, store the paths:
setParamPaths(sortedPaths);

// Handler for "Run" button:
const handleRunRow = (rowIndex: number) => {
  const row = resultsRows[rowIndex];

  // Clone base params and apply sampled values from this row
  const rowParams = structuredClone(config.params);
  paramPaths.forEach((path, i) => {
    const value = row[i];
    if (value !== '') {
      setNestedValue(rowParams, path, value);
    }
  });

  // Generate URL and open in new tab
  const url = encodeParamsToUrl(currentModel.name, rowParams);
  window.open(url, '_blank');
};

// Pass to ResultsTable:
<ResultsTable
  columns={resultsColumns}
  rows={resultsRows}
  onRunRow={handleRunRow}
/>
```

## Files to Modify/Create

### New Files
- `src/core/params/url.ts` - URL encoding/decoding utilities

### Modified Files
- `src/core/params/index.ts` - Export new URL utilities
- `src/App.tsx` - Load params from URL on mount
- `src/components/params/ParameterConfigView.tsx` - Add "Copy Share Link" button
- `src/components/batch/ResultsTable.tsx` - Add optional "Run" column
- `src/components/batch/BatchTab.tsx` - Implement row-to-URL logic

## Testing Plan

1. **Basic URL Sharing**
   - Modify some params, copy share link
   - Open in new tab → should restore exact params

2. **Different Models**
   - Switch to toy model, modify params
   - Share link should switch model correctly

3. **Results Table "Run" Button**
   - Run batch, compute statistics
   - Click "Run" on a row
   - New tab should have that row's parameters

4. **Edge Cases**
   - Complex nested params (cell_types)
   - Special characters in values
   - Very long URLs (warning if > 2000 chars?)

## Future Enhancements

1. **Include batch config in URL** - Share full batch configurations
2. **URL shortener integration** - For very complex configs
3. **Deep links to specific tabs** - `?tab=batch`
4. **Version/migration handling** - For evolving param schemas
