import { FilterManipulation, FilterParams, SegmentCoverData } from '../types';

const MANIPULATION_TAG_REGEX = /<freq_manipulation>([\s\S]*?)<\/freq_manipulation>/g;
const SEGMENT_COVER_TAG_REGEX = /<segment_cover>([\s\S]*?)<\/segment_cover>/;

export const parseAllManipulationTags = (content: string): FilterManipulation[] => {
  const regex = new RegExp(MANIPULATION_TAG_REGEX);
  const manipulations: FilterManipulation[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsedManipulation = JSON.parse(jsonContent) as FilterManipulation;
      manipulations.push(parsedManipulation);
    } catch (error) {
      console.error('Error parsing manipulation tag JSON:', error);
    }
  }

  return manipulations;
};

export const parseManipulationTags = parseAllManipulationTags;

export const parseSegmentCoverTag = (content: string): SegmentCoverData | null => {
  const match = content.match(SEGMENT_COVER_TAG_REGEX);
  if (!match) {
    return null;
  }

  try {
    const jsonContent = match[1].trim();
    const parsed = JSON.parse(jsonContent) as SegmentCoverData;
    const normalizedList = parsed?.data_list ?? parsed?.dataList;
    if (!Array.isArray(normalizedList)) {
      throw new Error('data_list must be an array');
    }
    const normalized: SegmentCoverData = {
      ...parsed,
      data_list: normalizedList,
      dataList: normalizedList,
    };
    return normalized;
  } catch (error) {
    console.error('Error parsing segment cover tag JSON:', error);
    return null;
  }
};

export const getFilterContext = (filters: FilterParams[]): string => {
  if (!filters.length) {
    return '当前没有应用任何滤波器。';
  }

  return `当前已应用的滤波器 (Current active filters):
${filters
    .map((filter: any) => {
      const id = filter.id ?? '';
      const type = filter.type ?? filter.filterType ?? 'unknown';
      const freq = filter.freq ?? filter.frequency;
      const gain = filter.gain;
      const qFactor = filter.qFactor ?? filter.q;
      const parts: string[] = [
        `- id: "${id}", type: "${type}"`,
        `freq: ${freq !== undefined ? freq : 'N/A'}`,
      ];
      if (gain !== undefined) parts.push(`gain: ${gain}`);
      if (qFactor !== undefined) parts.push(`qFactor: ${qFactor}`);
      return parts.join(', ');
    })
    .join('\n')}
(当你建议删除或编辑滤波器时，请使用上面列出的 'id'。)`;
};
