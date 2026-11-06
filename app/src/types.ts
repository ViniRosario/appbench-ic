// O contrato com a API mora em shared/contract.ts (fonte única para API e frontend).
// Os critérios (filtros) são do cliente: ver lib/criteria.ts.
export type {
  AppResult,
  AppSource,
  CollectionFunnel,
  CollectionInfo,
  ErrorResponse,
  FailedApp,
  JobAccepted,
  JobProgress,
  JobState,
  KeywordSearchRequest,
  QueryCount,
  SearchMode,
  SearchResponse,
  SeedInfo,
  SimilarSearchRequest,
  StoreLocale,
  TermMatch,
  TextField,
} from '../../shared/contract';
