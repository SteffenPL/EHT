import { MarkdownPage } from '@/components/MarkdownPage';
import { EHT_STATISTIC_METADATA } from '@/models/eht/statistics-metadata';
import statisticsContent from '@/docs/EHT/statistics.md?raw';

function renderStatisticDefinitions(): string {
  return EHT_STATISTIC_METADATA.map((stat) => {
    const notes = stat.notes.length > 0
      ? `\n${stat.notes.map((note) => `- ${note}`).join('\n')}\n`
      : '';

    return `### ${stat.id}

**${stat.title}**

$$${stat.formula}$$

Unit: **${stat.unit}**

${stat.description}
${notes}`;
  }).join('\n');
}

const content = statisticsContent.replace('{{STATISTIC_DEFINITIONS}}', renderStatisticDefinitions());

export function EHTStatisticsDocsPage() {
  return <MarkdownPage content={content} />;
}
