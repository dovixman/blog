// Single source of truth for the landing content.
// Only real data: do not add projects, clients, metrics or links that are not here.

export const START_YEAR = 2012;

export const profile = {
  name: 'David Fuentes',
  handle: 'dovixman',
  role: 'Lead Technical Architect',
  company: 'Intelygenz',
  email: 'me@dovixman.io',
  github: 'https://github.com/dovixman',
};

export interface Span {
  id: string;
  role: string;
  org: string;
  context?: string;
  from: number;
  to: number | null; // null = currently active
}

// Most recent first.
export const experience: Span[] = [
  { id: '07', role: 'Lead Technical Architect', org: 'Intelygenz', context: 'Proyecto MetTel', from: 2022, to: null },
  { id: '06', role: 'Technical Lead', org: 'Intelygenz', context: 'Proyecto Inditex', from: 2020, to: 2022 },
  { id: '05', role: 'Senior Software Architect', org: 'Intelygenz', context: 'Proyecto Inditex', from: 2019, to: 2020 },
  { id: '04', role: 'Senior Software Architect & DevOps', org: 'Minsait by Indra', from: 2018, to: 2019 },
  { id: '03', role: 'R&D and Architecture Lead', org: 'Almis Informática Financiera', from: 2017, to: 2018 },
  { id: '02', role: 'Spring/Java Developer', org: 'Almis Informática Financiera', from: 2015, to: 2018 },
  { id: '01', role: 'Java & Web Developer', org: 'Alecop S. Coop.', from: 2012, to: 2015 },
];

export interface Module {
  id: string;
  title: string;
  detail?: string;
  from: number;
  to: number | null;
}

export const education: Module[] = [
  { id: 'mod.ia', title: 'Máster en Inteligencia Artificial', from: 2020, to: null },
  {
    id: 'mod.sec',
    title: 'Máster en Ciberseguridad',
    detail: 'Especialización en seguridad en servicios y aplicaciones',
    from: 2017,
    to: 2018,
  },
  { id: 'mod.core', title: 'Grado en Ingeniería Informática', from: 2012, to: 2016 },
];

export interface Domain {
  n: string;
  key: string;
  tag: string;
  title: string;
  body: string;
}

export const domains: Domain[] = [
  {
    n: '01',
    key: 'arquitectura',
    tag: 'arch',
    title: 'Arquitectura de software',
    body: 'Sistemas con límites claros, contratos explícitos y decisiones que se pueden explicar. Diseñados pensando en cómo se van a operar, no solo en cómo se van a construir.',
  },
  {
    n: '02',
    key: 'liderazgo',
    tag: 'lead',
    title: 'Liderazgo de equipos',
    body: 'Liderazgo técnico cercano al código: equipos que entienden el porqué de cada decisión y tienen autonomía para ejecutarla.',
  },
  {
    n: '03',
    key: 'ciberseguridad',
    tag: 'sec',
    title: 'Ciberseguridad',
    body: 'La seguridad en servicios y aplicaciones como requisito de diseño desde el primer diagrama, no como un parche al final.',
  },
  {
    n: '04',
    key: 'ia',
    tag: 'ai',
    title: 'Inteligencia artificial',
    body: 'Formación de máster y exploración aplicada: entender dónde aporta valor real dentro de un sistema y dónde no.',
  },
  {
    n: '05',
    key: 'blockchain',
    tag: 'chain',
    title: 'Blockchain',
    body: 'Registros distribuidos y mecanismos de consenso, estudiados desde la arquitectura y con espíritu crítico.',
  },
  {
    n: '06',
    key: 'labs',
    tag: 'labs',
    title: 'Laboratorios personales',
    body: 'Un entorno propio para experimentar: prototipos, pruebas de concepto y aprendizaje continuo fuera del día a día.',
  },
];

export const organizations = Array.from(new Set(experience.map((e) => e.org)));
