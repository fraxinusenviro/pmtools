// Default task library for a multidisciplinary environmental consultancy.
// Phases and tasks reflect typical project workflows: site investigation,
// risk assessment, remediation, and regulatory reporting.

export interface LibraryTask {
  name: string
  description?: string
  isMilestone?: boolean
  duration: number // working days (0 = milestone)
  children?: LibraryTask[]
}

export interface LibraryPhase {
  name: string
  description?: string
  tasks: LibraryTask[]
}

export const ENV_CONSULTANCY_LIBRARY: LibraryPhase[] = [
  {
    name: 'Project Initiation & Planning',
    description: 'Establish project framework, objectives, and initial planning documentation.',
    tasks: [
      { name: 'Project kickoff meeting', duration: 1 },
      { name: 'Scope of work definition', duration: 3 },
      { name: 'Health, Safety & Environment (HSE) plan', duration: 3 },
      { name: 'Project schedule development', duration: 2 },
      { name: 'Regulatory framework review', duration: 3 },
      { name: 'Permitting requirements assessment', duration: 2 },
      { name: 'Stakeholder identification & engagement plan', duration: 2 },
      { name: 'Subcontractor procurement', duration: 5 },
      { name: 'Quality assurance & quality control (QA/QC) plan', duration: 2 },
      { name: 'Project initiation sign-off', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Desktop Studies & Preliminary Assessment',
    description: 'Review existing data and conduct non-intrusive preliminary environmental assessment.',
    tasks: [
      { name: 'Historical land use research', duration: 3 },
      { name: 'Regulatory database searches (EPA, state agency, ASTM)', duration: 2 },
      { name: 'Topographic & geological map review', duration: 2 },
      { name: 'Hydrogeological desktop review', duration: 3 },
      { name: 'Aerial photo & satellite imagery review', duration: 1 },
      { name: 'Site reconnaissance visit', duration: 1 },
      { name: 'Preliminary risk assessment', duration: 3 },
      { name: 'Preliminary Conceptual Site Model (CSM)', duration: 3 },
      { name: 'Phase I / Desktop Assessment report', duration: 5 },
      { name: 'Desktop study complete', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Field Investigation',
    description: 'Intrusive site investigation including soil, groundwater, and environmental sampling.',
    tasks: [
      { name: 'Investigation work plan preparation', duration: 5 },
      { name: 'Regulatory notification & field permits', duration: 5 },
      { name: 'Subcontractor engagement (drilling / excavation)', duration: 3 },
      { name: 'Utility clearance & mark-out', duration: 2 },
      { name: 'Field mobilisation & site setup', duration: 1 },
      { name: 'Site HSE induction & pre-start meeting', duration: 1 },
      {
        name: 'Soil investigation',
        duration: 5,
        children: [
          { name: 'Test pit / borehole drilling', duration: 3 },
          { name: 'Soil logging & description', duration: 3 },
          { name: 'Soil sampling & field screening', duration: 3 },
        ],
      },
      {
        name: 'Groundwater investigation',
        duration: 7,
        children: [
          { name: 'Monitoring well installation', duration: 3 },
          { name: 'Well development & surging', duration: 2 },
          { name: 'Groundwater level measurement', duration: 1 },
          { name: 'Groundwater sampling', duration: 2 },
        ],
      },
      { name: 'Surface water & sediment sampling', duration: 2 },
      { name: 'Soil gas & vapour intrusion survey', duration: 2 },
      { name: 'Air quality monitoring', duration: 2 },
      { name: 'Geophysical survey (if required)', duration: 2 },
      { name: 'Field demobilisation & site restoration', duration: 1 },
      { name: 'Field data QA/QC & chain of custody review', duration: 2 },
      { name: 'Field investigation complete', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Laboratory Analysis',
    description: 'Submit environmental samples for accredited laboratory analysis and validate results.',
    tasks: [
      { name: 'Sample dispatch & chain of custody confirmation', duration: 1 },
      { name: 'Laboratory analysis — soils (inorganics, organics, PFAS)', duration: 10 },
      { name: 'Laboratory analysis — groundwater', duration: 7 },
      { name: 'Laboratory analysis — surface water & sediments', duration: 7 },
      { name: 'Laboratory analysis — soil gas / vapour', duration: 5 },
      { name: 'Laboratory results review & data validation', duration: 3 },
      { name: 'Data management & upload to project database', duration: 2 },
      { name: 'Laboratory results received & validated', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Data Analysis & Risk Assessment',
    description: 'Analyse investigation data, update conceptual site model and assess environmental and health risks.',
    tasks: [
      { name: 'Data quality review', duration: 2 },
      { name: 'Contaminant distribution & extent analysis', duration: 3 },
      { name: 'Fate & transport analysis', duration: 3 },
      { name: 'Human health risk assessment (HHRA)', duration: 7 },
      { name: 'Ecological risk assessment (ERA)', duration: 5 },
      { name: 'Groundwater flow & contaminant transport modelling', duration: 7 },
      { name: 'Vapour intrusion assessment', duration: 3 },
      { name: 'Remedial options assessment', duration: 5 },
      { name: 'Updated Conceptual Site Model', duration: 3 },
      { name: 'Preliminary remediation objectives defined', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Reporting',
    description: 'Prepare, peer-review, and submit technical reports to client and regulatory bodies.',
    tasks: [
      { name: 'Draft report preparation', duration: 10 },
      { name: 'Internal peer review & QA/QC', duration: 3 },
      { name: 'Client review (comment period)', duration: 5 },
      { name: 'Comment response & report revision', duration: 3 },
      { name: 'Final report preparation & sign-off', duration: 2 },
      { name: 'Regulatory submission', duration: 1 },
      { name: 'Regulatory review period', duration: 20 },
      { name: 'Regulatory response / approval received', duration: 5 },
      { name: 'Final report issued', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Remediation (if required)',
    description: 'Design, procure, implement, and validate site remediation works to meet cleanup objectives.',
    tasks: [
      { name: 'Remedial action plan (RAP) preparation', duration: 10 },
      { name: 'Regulatory approval of remediation plan', duration: 15 },
      { name: 'Remediation design & specifications', duration: 10 },
      { name: 'Remediation contractor procurement', duration: 7 },
      { name: 'Contractor mobilisation & site setup', duration: 3 },
      { name: 'Active remediation works', duration: 30 },
      { name: 'Interim performance monitoring', duration: 5 },
      {
        name: 'Verification & validation',
        duration: 10,
        children: [
          { name: 'Verification sampling', duration: 3 },
          { name: 'Laboratory analysis — verification samples', duration: 7 },
          { name: 'Validation data review & sign-off', duration: 3 },
        ],
      },
      { name: 'Site remediation validation report', duration: 7 },
      { name: 'Regulatory site sign-off / closure letter', duration: 10 },
      { name: 'Site remediated & signed off', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Ecological & Biodiversity Assessment',
    description: 'Field surveys and assessment of ecological values, biodiversity, and protected species.',
    tasks: [
      { name: 'Desktop flora & fauna review', duration: 3 },
      { name: 'Threatened species & EPBC Act assessment', duration: 3 },
      { name: 'Vegetation mapping field survey', duration: 3 },
      { name: 'Flora species identification & recording', duration: 3 },
      { name: 'Fauna habitat assessment', duration: 2 },
      { name: 'Fauna trapping & spotlighting survey', duration: 5 },
      { name: 'Aquatic ecology assessment', duration: 3 },
      { name: 'Biodiversity offset assessment', duration: 3 },
      { name: 'Ecological impact assessment report', duration: 7 },
      { name: 'Ecological assessment complete', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Environmental Impact Assessment (EIA)',
    description: 'Comprehensive assessment of project impacts and development of mitigation measures.',
    tasks: [
      { name: 'Terms of reference / scoping study', duration: 5 },
      { name: 'Baseline environment characterisation', duration: 10 },
      { name: 'Impact identification & significance assessment', duration: 5 },
      { name: 'Mitigation measures development', duration: 5 },
      { name: 'Stakeholder & community consultation', duration: 10 },
      { name: 'Draft EIA / EIS preparation', duration: 20 },
      { name: 'Regulatory & public exhibition period', duration: 20 },
      { name: 'Response to submissions', duration: 7 },
      { name: 'Final EIA / EIS submission', duration: 3 },
      { name: 'Regulatory determination received', duration: 0, isMilestone: true },
    ],
  },
  {
    name: 'Environmental Management & Monitoring',
    description: 'Ongoing environmental compliance monitoring and management plan implementation.',
    tasks: [
      { name: 'Environmental management plan (EMP) development', duration: 5 },
      { name: 'Erosion & sediment control plan', duration: 3 },
      { name: 'Groundwater monitoring round', duration: 3 },
      { name: 'Surface water monitoring round', duration: 2 },
      { name: 'Noise & vibration monitoring', duration: 2 },
      { name: 'Dust & air quality monitoring', duration: 2 },
      { name: 'Compliance audit', duration: 2 },
      { name: 'Environmental monitoring report', duration: 3 },
      { name: 'Annual environmental compliance report', duration: 5 },
    ],
  },
  {
    name: 'Project Management & Administration',
    description: 'Ongoing project administration, client communication, and financial management.',
    tasks: [
      { name: 'Monthly progress report to client', duration: 1 },
      { name: 'Fortnightly team progress meeting', duration: 1 },
      { name: 'Risk register review & update', duration: 1 },
      { name: 'Invoice preparation & submission', duration: 1 },
      { name: 'Budget monitoring & cost control', duration: 1 },
      { name: 'Subcontractor management & invoice review', duration: 1 },
      { name: 'Change order / variation management', duration: 1 },
      { name: 'Project close-out & lessons learned review', duration: 2 },
      { name: 'Project records archived & closed', duration: 0, isMilestone: true },
    ],
  },
]
