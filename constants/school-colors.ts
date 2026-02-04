/**
 * 5C School Colors for Dining Halls
 */

export type School = 'Pomona' | 'CMC' | 'HarveyMudd' | 'Scripps' | 'Pitzer';

export const SCHOOL_COLORS: Record<School, { primary: string; text: string }> = {
  Pomona: {
    primary: '#rgb(56, 101, 200)', // Pomona Blue
    text: '#FFFFFF',
  },
  CMC: {
    primary: '#c62d47', // CMC Maroon
    text: '#FFFFFF',
  },
  HarveyMudd: {
    primary: '#rgb(214, 151, 0)', // HMC Gold
    text: '#1A1814',
  },
  Scripps: {
    primary: '#rgb(73, 145, 110)', // Scripps Green
    text: '#FFFFFF',
  },
  Pitzer: {
    primary: '#rgb(227, 114, 29)', // Pitzer Orange
    text: '#FFFFFF',
  },
};

export const HALL_TO_SCHOOL: Record<string, School> = {
  Hoch: 'HarveyMudd',
  McConnell: 'Pitzer',
  Collins: 'CMC',
  Malott: 'Scripps',
  Frary: 'Pomona',
  Frank: 'Pomona',
  Oldenborg: 'Pomona',
  Scripps: 'Scripps',
};
