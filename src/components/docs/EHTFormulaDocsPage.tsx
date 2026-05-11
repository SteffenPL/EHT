import { MarkdownPage } from '@/components/MarkdownPage';
import { FormulaSpatialExplainer } from '@/components/params/FormulaSpatialExplainer';

export function EHTFormulaDocsPage({ content }: { content: string }) {
  return (
    <MarkdownPage content={content} className="max-w-5xl">
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Interactive spatial variable explainer</h2>
        <p className="mt-2 text-muted-foreground">
          Adjust perimeter, aspect ratio, and alpha to see how a sample nucleus position and the surrounding vector field map to formula variables.
        </p>
        <FormulaSpatialExplainer className="mt-4" />
      </section>
    </MarkdownPage>
  );
}
