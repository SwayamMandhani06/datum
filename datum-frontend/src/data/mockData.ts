import type { DocumentItem, Citation, QAExchange } from '../types';

export const mockDocuments: DocumentItem[] = [
  {
    id: 'DOC-AUTOSAR-4.4.0',
    filename: 'AUTOSAR_TPS_SoftwareComponentTemplate.pdf',
    pageCount: 412,
    uploadDate: '2026-08-24',
    description: 'AUTOSAR Classic Platform Release 4.4.0 Software Component Template Specification',
    standardVersion: 'Release 4.4.0',
  },
  {
    id: 'DOC-CANIF-4.3.1',
    filename: 'AUTOSAR_SWS_CANInterface.pdf',
    pageCount: 184,
    uploadDate: '2026-08-12',
    description: 'Specification of CAN Interface Driver and Hardware Abstraction Layer',
    standardVersion: 'Release 4.3.1',
  },
];

export const mockCitations: Record<number, Citation> = {
  1: {
    id: 1,
    documentId: 'DOC-AUTOSAR-4.4.0',
    documentName: 'AUTOSAR_TPS_SoftwareComponentTemplate.pdf',
    section: 'Section 4.2',
    page: 'Page 38',
    technicalEntity: 'EngineSpeedSensor.pp_EngineSpeed',
    excerpt: 'A SensorActuatorSoftwareComponentType represents a sensor or actuator hardware abstraction. The EngineSpeedSensor component specifies PPortPrototype pp_EngineSpeed referencing SenderReceiverInterface If_EngineSpeed with data element EngineSpeed_Rpm (uint16, resolution 0.25 rpm, range 0..8000 rpm). Transmission mode is periodic at 10ms cycle time.',
    isLowConfidence: false,
  },
  2: {
    id: 2,
    documentId: 'DOC-AUTOSAR-4.4.0',
    documentName: 'AUTOSAR_TPS_SoftwareComponentTemplate.pdf',
    section: 'Section 4.5.1',
    page: 'Page 47',
    technicalEntity: 'EngineSpeedSensor.pr_SensorDiagnostics',
    excerpt: 'PRPortPrototype pr_SensorDiagnostics provides combined client and server semantics for diagnostic routines. ClientServerOperation ReadFaultMemory and ClearFaultMemory are defined within interface If_SensorDiagnostics. Note that server implementation behavior may vary across underlying BSW ECUC configurations.',
    isLowConfidence: true,
    confidenceNote: 'Low confidence — verify against source',
  },
  3: {
    id: 3,
    documentId: 'DOC-AUTOSAR-4.4.0',
    documentName: 'AUTOSAR_TPS_SoftwareComponentTemplate.pdf',
    section: 'Section 6.3.2',
    page: 'Page 84',
    technicalEntity: 'ib_EngineSpeedSensor.RE_SampleEngineSpeed',
    excerpt: 'RunnableEntity RE_SampleEngineSpeed is configured with canBeInvokedConcurrently set to false. It is bound to TimingEvent TE_10ms referencing period 0.01. DataWriteAccess is granted for data element EngineSpeed_Rpm of port pp_EngineSpeed. Symbol definition maps to C-function EngineSpeed_SampleMainFunction().',
    isLowConfidence: false,
  },
  4: {
    id: 4,
    documentId: 'DOC-AUTOSAR-4.4.0',
    documentName: 'AUTOSAR_TPS_SoftwareComponentTemplate.pdf',
    section: 'Section 8.1.4',
    page: 'Page 129',
    technicalEntity: 'SwcInternalBehavior.ExecutionBudget',
    excerpt: 'The execution budget for RE_SampleEngineSpeed is constrained to 350 microseconds on a single core of the target microcontroller at 240MHz. Category 1 ISR latency is excluded from this budget computation.',
    isLowConfidence: false,
  },
};

export const initialExchanges: QAExchange[] = [
  {
    id: 'qa-1',
    question: 'What ports does the EngineSpeedSensor component expose?',
    timestamp: '14:32',
    answerSegments: [
      {
        type: 'text',
        content: 'The EngineSpeedSensor software component exposes two distinct port prototypes. First, it defines pp_EngineSpeed as a PPortPrototype typed by the SenderReceiverInterface named If_EngineSpeed ',
      },
      {
        type: 'citation',
        citationId: 1,
      },
      {
        type: 'text',
        content: '. This port transmits the filtered engine rotational velocity at a 10ms periodic cycle. Second, it includes a PRPortPrototype designated as pr_SensorDiagnostics typed by ClientServerInterface for onboard diagnostic interrogation and fault memory clearance ',
      },
      {
        type: 'citation',
        citationId: 2,
      },
      {
        type: 'text',
        content: '.',
      },
    ],
  },
  {
    id: 'qa-2',
    question: 'How is the internal behavior mapped to runnables for periodic execution?',
    timestamp: '14:35',
    answerSegments: [
      {
        type: 'text',
        content: 'The internal behavior ib_EngineSpeedSensor declares a single runnable entity RE_SampleEngineSpeed configured with canBeInvokedConcurrently set to false. It is activated by a TimingEvent named TE_10ms configured with a cyclic activation period of 0.01 seconds (10ms) ',
      },
      {
        type: 'citation',
        citationId: 3,
      },
      {
        type: 'text',
        content: '. The runnable maintains direct DataWriteAccess to the EngineSpeed_Rpm data element and executes via the C symbol EngineSpeed_SampleMainFunction.',
      },
    ],
  },
];
