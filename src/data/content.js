// Single source of truth for the landing copy. Every fact here comes from
// David's real profile — do not add projects, clients or metrics that are
// not listed.

export const person = {
  name: 'David Fuentes',
  handle: 'dovixman',
  role: 'Lead Technical Architect',
  company: 'Intelygenz',
  project: 'MetTel',
  email: 'me@dovixman.io',
  github: 'https://github.com/dovixman',
};

/**
 * Stations of the journey. `id` is the section anchor; `accent` drives both
 * the HTML theme and the matching planet in the 3D scene.
 */
export const stations = [
  {
    id: 'arquitectura',
    index: '01',
    label: 'Arquitectura',
    title: 'Arquitectura de software',
    kicker: 'Planeta de las estructuras',
    accent: '#5ee7ff',
    body: [
      'Diseñar sistemas que aguanten el paso del tiempo: límites claros, piezas que encajan y decisiones técnicas que se pueden explicar y defender.',
      'Es el hilo conductor de mi carrera, desde el I+D en Almis Informática Financiera hasta la arquitectura para Inditex y, hoy, la dirección técnica en el proyecto MetTel.',
    ],
    facts: [
      'Lead Technical Architect · Intelygenz / MetTel',
      'Senior Software Architect · Intelygenz / Inditex',
      'Senior Software Architect & DevOps · Minsait by Indra',
      'R&D and Architecture Lead · Almis',
    ],
  },
  {
    id: 'liderazgo',
    index: '02',
    label: 'Liderazgo',
    title: 'Liderazgo de equipos',
    kicker: 'Planeta de la órbita compartida',
    accent: '#ffb547',
    body: [
      'Liderar un equipo técnico es poner a personas, producto y arquitectura a orbitar en la misma dirección.',
      'Como Technical Lead en Intelygenz para Inditex y ahora como Lead Technical Architect en MetTel, mi trabajo es que el equipo decida mejor, con contexto y con criterio.',
    ],
    facts: [
      'Technical Lead · Intelygenz / Inditex · 2020–2022',
      'Lead Technical Architect · Intelygenz / MetTel · 2022–actualidad',
    ],
  },
  {
    id: 'ia',
    index: '03',
    label: 'IA',
    title: 'Inteligencia artificial',
    kicker: 'Núcleo neuronal',
    accent: '#b79bff',
    body: [
      'La IA como la siguiente capa de la arquitectura: entender los modelos por dentro para tratarlos con el mismo rigor que cualquier otro componente de un sistema.',
      'Por eso curso un Máster en Inteligencia Artificial desde 2020.',
    ],
    facts: ['Máster en Inteligencia Artificial · 2020–'],
  },
  {
    id: 'ciberseguridad',
    index: '04',
    label: 'Ciberseguridad',
    title: 'Ciberseguridad',
    kicker: 'Planeta escudo',
    accent: '#4dffa6',
    body: [
      'La seguridad no es una capa que se añade al final: es una propiedad del diseño, igual que el rendimiento o la mantenibilidad.',
      'Me especialicé en seguridad en servicios y aplicaciones con un Máster en Ciberseguridad.',
    ],
    facts: ['Máster en Ciberseguridad · Seguridad en servicios y aplicaciones · 2017–2018'],
  },
  {
    id: 'laboratorios',
    index: '05',
    label: 'Laboratorios',
    title: 'Laboratorios & blockchain',
    kicker: 'Cadena de bloques en órbita',
    accent: '#ff7ad9',
    body: [
      'Fuera del día a día mantengo laboratorios personales: un espacio para experimentar con blockchain y tecnologías emergentes, romper cosas y aprender rápido.',
      'Lo que sale de ahí vive en GitHub.',
    ],
    facts: [],
    link: { href: 'https://github.com/dovixman', text: 'Ver github.com/dovixman' },
  },
];

export const experience = [
  { role: 'Lead Technical Architect', org: 'Intelygenz', detail: 'MetTel', period: '2022 — actualidad', current: true },
  { role: 'Technical Lead', org: 'Intelygenz', detail: 'Inditex', period: '2020 — 2022' },
  { role: 'Senior Software Architect', org: 'Intelygenz', detail: 'Inditex', period: '2019 — 2020' },
  { role: 'Senior Software Architect & DevOps', org: 'Minsait by Indra', period: '2018 — 2019' },
  { role: 'R&D and Architecture Lead', org: 'Almis Informática Financiera', period: '2017 — 2018' },
  { role: 'Spring/Java Developer', org: 'Almis Informática Financiera', period: '2015 — 2018' },
  { role: 'Java & Web Developer', org: 'Alecop S. Coop.', period: '2012 — 2015' },
];

export const education = [
  { title: 'Máster en Inteligencia Artificial', period: '2020 —' },
  { title: 'Máster en Ciberseguridad', detail: 'Especialización en seguridad en servicios y aplicaciones', period: '2017 — 2018' },
  { title: 'Grado en Ingeniería Informática', period: '2012 — 2016' },
];

/** Full navigation index (used by the header menu and side rail). */
export const navItems = [
  { id: 'inicio', index: '00', label: 'Inicio' },
  ...stations.map(({ id, index, label }) => ({ id, index, label })),
  { id: 'trayectoria', index: '06', label: 'Trayectoria' },
  { id: 'contacto', index: '07', label: 'Contacto' },
];
