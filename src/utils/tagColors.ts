export const TAG_COLORS: string[] = [
  '#D62929', '#3995EA', '#DDD62C', '#8C3EEF', '#3FE331',
  '#F443AD', '#35E9D3', '#DB6929', '#3A57EE', '#A8E12D',
  '#CF3FF3', '#32E764', '#D92651', '#36C1EC', '#DFAC2A',
  '#603BF1', '#69E52E', '#E057CA', '#33EBA9', '#DD3D27',
  '#3881F0', '#D5E32B', '#A154DE', '#2FE937', '#DB247C',
  '#34EFEF', '#E28128', '#3941F3', '#95E82C', '#D755E2',
  '#31ED7C', '#E0243B', '#36AEF2', '#E6C828', '#7F52E0',
  '#53EB2D', '#DE21A9', '#32F1C3', '#E45325', '#4E77DF',
  '#C3EA2A', '#B653E4', '#2EEF4D', '#E22267', '#4BCBDD',
  '#E89B26', '#5B50E2', '#81EE2B', '#E01FD9', '#30F395',
];

export function getTagColor(existingTagIds: number): string {
  return TAG_COLORS[existingTagIds % TAG_COLORS.length];
}
