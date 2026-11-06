/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiagramType } from '../types/diagram';

export interface DiagramTypeDefinition {
  id: DiagramType;
  name: string;
  category: 'Software & Data' | 'Business Process' | 'Industrial & Engineering' | 'Project Management' | 'Regulatory & Quality';
  standard: string;
  badgeColor: string;
  iconName: string;
  summary: string;
  description: string;
  keyElements: string[];
  useCases: string[];
}

export const DIAGRAM_TYPES_CATALOG: DiagramTypeDefinition[] = [
  // 0. Universal Freeform Studio
  {
    id: 'generic',
    name: 'Universal Freeform Studio (No Rules - All Shapes)',
    category: 'Business Process',
    standard: 'Multi-Paradigm Freeform (Unrestricted)',
    badgeColor: 'purple',
    iconName: 'Sparkles',
    summary: 'Unrestricted open canvas with no notation rules. Mix ERD, BPMN, UML, DFD, Gantt, and Sticky Notes freely.',
    description: 'Designed for rapid prototyping and hybrid architectures where strict notation rules are disabled. All shape toolboxes and connectors are simultaneously available.',
    keyElements: ['All Diagram Shapes', 'Zero Grammar Restrictions', 'Any Connector Type', 'Sticky Notes Everywhere'],
    useCases: ['Whiteboarding', 'Cross-Domain System Architecture', 'Brainstorming Hybrid Solutions'],
  },

  // 1. ERD
  {
    id: 'erd',
    name: 'Entity Relationship Diagram (ERD)',
    category: 'Software & Data',
    standard: 'Chen / Crow’s Foot Notation',
    badgeColor: 'sky',
    iconName: 'Table',
    summary: 'Relational data modeling with entities, attributes, primary/foreign keys, and cardinalities.',
    description: 'Models database schemas and relationships between tables using Crow’s foot notation (1:1, 1:N, N:M), identifying primary keys, unique indexes, and referential constraints.',
    keyElements: ['Entity Tables', 'PK / FK Badges', 'Data Types', 'Crow’s Foot (1..*, 0..*)', 'Unique Constraints'],
    useCases: ['PostgreSQL / MySQL Schema Design', 'ORM Mapping', 'Data Warehousing', 'Data Lineage'],
  },

  // 2. BPMN 2.0
  {
    id: 'bpmn',
    name: 'BPMN 2.0 Business Process',
    category: 'Business Process',
    standard: 'OMG BPMN 2.0.2',
    badgeColor: 'blue',
    iconName: 'Cpu',
    summary: 'End-to-end business workflows with events, tasks, gateways, and sub-processes.',
    description: 'Industry standard for executable and analytical workflow modeling. Features Start/Intermediate/End events, User/Service tasks, Exclusive XOR & Parallel AND gateways, and nested sub-process drill-downs.',
    keyElements: ['Start / End Events', 'Service / User Tasks', 'Exclusive Gateways (XOR)', 'Sub-Processes [ + ]', 'Sequence Flows'],
    useCases: ['Customer Onboarding', 'Order Fulfillment', 'Incident Management', 'Approval Chains'],
  },

  // 3. Swimlanes & Pools
  {
    id: 'swimlane',
    name: 'Swimlanes & Cross-Functional Pools',
    category: 'Business Process',
    standard: 'BPMN / Rummler-Brache',
    badgeColor: 'indigo',
    iconName: 'Columns3',
    summary: 'Departmental divisions and organizational boundaries for multi-actor workflows.',
    description: 'Horizontal and vertical swimlanes that visually partition responsibility across teams, microservices, or external partners with automatic nested node enclosure.',
    keyElements: ['Horizontal Pools', 'Vertical Swimlanes', 'Cross-Lane Connectors', 'Nested Node Enclosure'],
    useCases: ['Cross-Department Handoffs', 'Inter-Company Protocols', 'Role-Based Workflows'],
  },

  // 4. UML Class Diagram
  {
    id: 'uml',
    name: 'UML Class Diagram & Interfaces',
    category: 'Software & Data',
    standard: 'OMG UML 2.5.1',
    badgeColor: 'cyan',
    iconName: 'Component',
    summary: 'Object-oriented structural model depicting classes, interfaces, attributes, and methods.',
    description: 'Models static software architecture including classes, abstract types, stereotypes («interface», «service»), member visibility (+, -, #), inheritance, and dependency injection.',
    keyElements: ['Stereotypes («interface»)', 'Attributes & Types', 'Methods & Signatures', 'Visibility (+, -, #)', 'Composition Diamonds'],
    useCases: ['Domain-Driven Design (DDD)', 'API Class Architecture', 'Design Patterns (Adapter/Factory)'],
  },

  // 5. UML Sequence Diagram
  {
    id: 'uml-sequence',
    name: 'UML Sequence Diagram',
    category: 'Software & Data',
    standard: 'OMG UML 2.5.1',
    badgeColor: 'teal',
    iconName: 'ArrowDownUp',
    summary: 'Time-ordered interactions between system lifelines, actors, and services.',
    description: 'Visualizes synchronous calls, asynchronous events, return values, and activation boxes along vertical lifelines to show chronological communication.',
    keyElements: ['Lifelines', 'Activation Bars', 'Synchronous Calls', 'Async Events', 'Return Flows'],
    useCases: ['OAuth 2.0 Handshakes', 'Microservice RPC Chains', 'Payment Authorization Flows'],
  },

  // 6. UML Use Case Diagram
  {
    id: 'uml-usecase',
    name: 'UML Use Case Diagram',
    category: 'Software & Data',
    standard: 'OMG UML 2.5.1',
    badgeColor: 'blue',
    iconName: 'Users',
    summary: 'Actor interactions, system boundaries, and user functional requirements.',
    description: 'Defines actor roles (Human, External System) and their relationships to functional use case goals within a clear system boundary box.',
    keyElements: ['Actor Stick Figures', 'Use Case Ovals', 'System Boundary', '«include» / «extend»'],
    useCases: ['Requirements Gathering', 'User Story Mapping', 'Security Authorization Boundaries'],
  },

  // 7. UML State Machine Diagram
  {
    id: 'uml-state',
    name: 'UML State Machine Diagram',
    category: 'Software & Data',
    standard: 'OMG UML 2.5.1 / Harel Statecharts',
    badgeColor: 'violet',
    iconName: 'CircleDot',
    summary: 'Finite state machines with states, transitions, guard conditions, and actions.',
    description: 'Captures the discrete lifecycle of an entity (e.g. Order: Created -> Paid -> Shipped -> Delivered) with triggers and guards.',
    keyElements: ['Initial / Final States', 'State Boxes', 'Transition Arrows', 'Guards [Condition]', 'Entry/Exit Actions'],
    useCases: ['Order Lifecycle States', 'IoT Device Connection States', 'Game Character States'],
  },

  // 8. DFD (Data Flow Diagram - Gane & Sarson)
  {
    id: 'dfd',
    name: 'Data Flow Diagram (DFD - Gane & Sarson)',
    category: 'Software & Data',
    standard: 'Gane & Sarson Structured Analysis',
    badgeColor: 'sky',
    iconName: 'Database',
    summary: 'Flow of data between processes, data repositories, and external entities.',
    description: 'Structured systems analysis highlighting data inputs, transformations, persistent data stores, and outputs without procedural timing details.',
    keyElements: ['Process Rounded Boxes', 'Open Data Stores', 'External Entities', 'Data Stream Connectors'],
    useCases: ['Legacy System Modernization', 'Data Privacy Audits', 'ETL Pipeline Modeling'],
  },

  // 9. Yourdon / DeMarco
  {
    id: 'yourdon',
    name: 'Yourdon / DeMarco Structured Flow',
    category: 'Software & Data',
    standard: 'Yourdon-DeMarco Modern Structured Analysis',
    badgeColor: 'amber',
    iconName: 'Circle',
    summary: 'Classic structured methodology using process bubbles and parallel data stores.',
    description: 'Classic bubble notation with numbering hierarchies (Level 0 Context, Level 1 Process Breakdown, Level 2 Functional Primitives).',
    keyElements: ['Process Bubbles (1.0, 2.0)', 'Parallel Line Stores', 'Source/Sink Rectangles', 'Labeled Flow Arrows'],
    useCases: ['System Decomposition', 'Information Architecture', 'Business Logic Audits'],
  },

  // 10. IDEF0 (Function Architecture)
  {
    id: 'idef0',
    name: 'IDEF0 Function Architecture (ICOM)',
    category: 'Industrial & Engineering',
    standard: 'NIST FIPS PUB 183 / IEEE 1320.1',
    badgeColor: 'blue',
    iconName: 'SquareStack',
    summary: 'Strict industrial systems engineering: Inputs, Controls, Outputs, and Mechanisms.',
    description: 'Formal systems engineering standard where every activity box has Inputs entering from the left, Controls from the top, Outputs exiting to the right, and Mechanisms entering from the bottom.',
    keyElements: ['Function Box A0/A1', 'Inputs (Left)', 'Controls (Top)', 'Outputs (Right)', 'Mechanisms (Bottom)'],
    useCases: ['Aerospace & Defense Engineering', 'Enterprise Manufacturing', 'ISO 9001 Compliance'],
  },

  // 11. CEQA Process Flow
  {
    id: 'ceqa',
    name: 'CEQA Environmental Clearance Flow',
    category: 'Regulatory & Quality',
    standard: 'California Public Resources Code § 21000+',
    badgeColor: 'emerald',
    iconName: 'FileCheck2',
    summary: 'California Environmental Quality Act: Exemptions, Initial Study, MND, EIR, & NOD.',
    description: 'Covers the complete statutory roadmap for California environmental clearance: Phase 1 Preliminary Review & Statutory Exemptions, Phase 2 Initial Study Checklist (Appendix G), Phase 3 Negative Declaration vs EIR determination, Phase 4 Draft EIR & 45-day Public Review, Phase 5 Final EIR Certification & Notice of Determination (NOD).',
    keyElements: ['Phase 1 Preliminary & Exemption', 'Initial Study Appendix G', 'MND vs EIR Decision', '45-Day Public Review', 'Notice of Determination (NOD)'],
    useCases: ['Infrastructure Projects', 'Urban Land Development', 'Environmental Impact Clearance'],
  },

  // 12. SIPOC Matrix
  {
    id: 'sipoc',
    name: 'SIPOC High-Level Value Matrix',
    category: 'Regulatory & Quality',
    standard: 'Six Sigma / DMAIC Process Mapping',
    badgeColor: 'yellow',
    iconName: 'ListOrdered',
    summary: 'Suppliers, Inputs, Process, Outputs, and Customers 5-column organizational flow.',
    description: 'High-level macroscopic view establishing organizational consensus before deep process re-engineering. Links upstream suppliers with downstream customer deliverables.',
    keyElements: ['Suppliers (S)', 'Inputs (I)', 'Process (P)', 'Outputs (O)', 'Customers (C)'],
    useCases: ['Six Sigma DMAIC Define Phase', 'Supply Chain Optimization', 'Executive Alignment'],
  },

  // 13. PERT Charts
  {
    id: 'pert',
    name: 'PERT Network & Critical Path',
    category: 'Project Management',
    standard: 'Program Evaluation & Review Technique (DoD/PMBOK)',
    badgeColor: 'rose',
    iconName: 'Network',
    summary: 'Activity network with ES, EF, LS, LF, Slack calculations, and Critical Path.',
    description: 'Calculates the critical path of zero-slack project dependencies. Displays 6-quadrant nodes showing Early Start, Duration, Early Finish, Late Start, Slack buffer, and Late Finish.',
    keyElements: ['6-Quadrant Nodes', 'Early Start / Finish (ES/EF)', 'Late Start / Finish (LS/LF)', 'Slack Buffer Time', 'Critical Path Highlighting'],
    useCases: ['Complex Construction Projects', 'Software Release Schedules', 'Resource Bottleneck Analysis'],
  },

  // 14. Gantt Charts
  {
    id: 'gantt',
    name: 'Gantt Timeline Schedule',
    category: 'Project Management',
    standard: 'Henry Gantt Project Tracking',
    badgeColor: 'emerald',
    iconName: 'CalendarCheck',
    summary: 'Visual timeline with task bars, milestones, completion percentages, and dates.',
    description: 'Tracks delivery schedule against calendar time with interactive progress indicators, start/end dates, milestone diamonds, and resource assignments.',
    keyElements: ['Timeline Task Bars', 'Milestone Diamonds', 'Progress % Fill', 'Start/End Dates', 'Assignee Avatars'],
    useCases: ['Product Roadmaps', 'Sprint Releases', 'Client Milestone Delivery'],
  },

  // 15. Standard Flowcharts
  {
    id: 'flowchart',
    name: 'Standard ANSI/ISO Flowcharts',
    category: 'Business Process',
    standard: 'ANSI / ISO 5807',
    badgeColor: 'blue',
    iconName: 'GitFork',
    summary: 'Universal decision logic with processes, diamonds, terminals, documents, and I/O.',
    description: 'The foundation of algorithm and procedure mapping. Includes decision diamonds with yes/no branches, process blocks, terminal capsules, and document waves.',
    keyElements: ['Action Steps', 'Decision Diamonds', 'Terminus Capsules', 'I/O Parallelograms', 'Document Waves'],
    useCases: ['Standard Operating Procedures (SOP)', 'Algorithm Logic', 'Support Escalation Trees'],
  },

  // 16. C4 Architecture Model
  {
    id: 'c4',
    name: 'C4 Software Architecture Model',
    category: 'Software & Data',
    standard: 'Simon Brown C4 Model',
    badgeColor: 'indigo',
    iconName: 'Layers',
    summary: 'Hierarchical zoom levels: Context, Containers, Components, and Code.',
    description: 'Provides maps of software systems at varying levels of abstraction: Context (ecosystem), Containers (apps, databases, microservices), and Components (internal modules).',
    keyElements: ['Software Systems', 'Container Boxes', 'Component Modules', 'Technology Labels', 'User Actors'],
    useCases: ['Cloud Native Architecture', 'Microservice Ecosystems', 'Developer Onboarding'],
  },

  // 17. Mind Map & Concept Map
  {
    id: 'mindmap',
    name: 'Mind Map & Concept Map',
    category: 'Business Process',
    standard: 'Tony Buzan / Novak Concept Mapping',
    badgeColor: 'purple',
    iconName: 'Sparkles',
    summary: 'Non-linear ideation, central themes, branching thoughts, and semantic relations.',
    description: 'Brainstorming and knowledge architecture tree radiating outward from a central concept with curved thought connectors and colored idea clusters.',
    keyElements: ['Central Core Node', 'Primary Branches', 'Sub-Idea Nodes', 'Thought Connectors'],
    useCases: ['Brainstorming Sessions', 'Information Architecture', 'Taxonomy & Knowledge Graphs'],
  },

  // 18. Value Stream Mapping (VSM)
  {
    id: 'vsm',
    name: 'Value Stream Mapping (Lean VSM)',
    category: 'Industrial & Engineering',
    standard: 'Lean Manufacturing / Toyota Production System',
    badgeColor: 'amber',
    iconName: 'TrendingUp',
    summary: 'Material and information flows, cycle times, lead times, and inventory buffers.',
    description: 'Lean diagnostic tool distinguishing value-added processing time from non-value-added waiting time, complete with inventory triangles and timeline ladders.',
    keyElements: ['Process Boxes', 'Inventory Triangles', 'Cycle Time (C/T)', 'Lead Time Ladder', 'Kaizen Bursts'],
    useCases: ['Lean Waste Elimination', 'Lead Time Reduction', 'Manufacturing Optimization'],
  },

  // 19. Cause & Effect (Fishbone / Ishikawa)
  {
    id: 'fishbone',
    name: 'Cause & Effect (Ishikawa Fishbone)',
    category: 'Regulatory & Quality',
    standard: 'Kaoru Ishikawa Quality Control (6M)',
    badgeColor: 'rose',
    iconName: 'GitBranch',
    summary: 'Root cause analysis with 6M branches: Man, Machine, Method, Material, Measurement.',
    description: 'Deconstructs the causes contributing to an effect or defect along primary structural bones to perform thorough 5-Whys root cause discovery.',
    keyElements: ['Problem Head', 'Spine Backbone', '6M Category Bones', 'Cause Nodes', 'Sub-Cause Twigs'],
    useCases: ['Incident Post-Mortems', 'Quality Assurance Audits', 'Defect Root Cause Analysis'],
  },
];
