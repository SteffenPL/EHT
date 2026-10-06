import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { MarkdownPage } from './components/MarkdownPage';
import { EHTFormulaDocsPage } from './components/docs/EHTFormulaDocsPage';
import { EHTStatisticsDocsPage } from './components/docs/EHTStatisticsDocsPage';
import { VIEW_DEFINITIONS } from './views/registry';
import { ModelProvider, MessagesProvider } from './contexts';

// Import models to register them
import './models';

// Static doc imports
import docsIndex from './docs/index.md?raw';
import ehtModel from './docs/EHT/model.md?raw';
import ehtFormulas from './docs/EHT/formulas.md?raw';
import ehtParameterFormatV2 from './docs/EHT/parameter-format-v2.md?raw';

function App() {
  return (
    <HashRouter>
      <ModelProvider>
        <MessagesProvider>
          <Routes>
            {/* View routes - rendered inside the shared app layout (header with view tabs) */}
            {VIEW_DEFINITIONS.map((view) => (
              <Route
                key={view.id}
                path={view.path}
                element={
                  <AppLayout>
                    <view.component />
                  </AppLayout>
                }
              />
            ))}

            {/* Documentation routes - standalone pages without app chrome */}
            <Route path="/docs" element={<MarkdownPage content={docsIndex} />} />
            <Route path="/docs/eht/model" element={<MarkdownPage content={ehtModel} />} />
            <Route path="/docs/eht/statistics" element={<EHTStatisticsDocsPage />} />
            <Route path="/docs/eht/formulas" element={<EHTFormulaDocsPage content={ehtFormulas} />} />
            <Route path="/docs/eht/parameter-format-v2" element={<MarkdownPage content={ehtParameterFormatV2} />} />
          </Routes>
        </MessagesProvider>
      </ModelProvider>
    </HashRouter>
  );
}

export default App;
