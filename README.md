# Chat Comparison Service

Standalone microservice that validates Chat behavior against PubNub during migration by periodically comparing messages from both systems.

## Overview

This service enables side-by-side validation of Chat against PubNub during Teams chat migration. It fetches messages from both systems, correlates them, and performs comprehensive validation without modifying the Teams service.

## Architecture

The service consists of the following modules:

- **Team Discovery**: Discovers and caches teams to monitor
- **Message Fetcher**: Fetches messages from both PubNub and Chat using RTC package
- **Message Matcher**: Correlates messages using PubNub timetoken and fuzzy matching
- **Comparison Engine**: Validates message count, content, ordering, coverage, and latency
- **Metrics & Alerting**: Emits metrics and triggers alerts based on thresholds

### Main Flow

```mermaid
flowchart TD
    Start([Application Start]) --> Init[Initialize Services]
    Init --> Scheduler[ComparisonScheduler.init]
    Scheduler --> StartScheduler{Enabled?}
    StartScheduler -->|Yes| RefreshTeams[Refresh Teams]
    StartScheduler -->|No| Stop([Service Running])
    
    RefreshTeams --> TeamDiscovery[TeamDiscoveryService.refreshTeams]
    TeamDiscovery --> Discover[Discover Teams from DB/Config]
    Discover --> Cache[Update TeamCache]
    
    Cache --> ScheduleIntervals[Schedule Intervals]
    ScheduleIntervals --> TeamInterval[Team Discovery Interval<br/>Every 30 min]
    ScheduleIntervals --> ComparisonInterval[Comparison Interval<br/>Every 15 min]
    
    ComparisonInterval --> RunComparison[Run Comparison]
    RunComparison --> GetTeams[Get Cached Teams]
    GetTeams --> CalculateWindow[Calculate Time Window]
    CalculateWindow --> FetchMessages[MessageFetcherService.fetchMessagesForTeams]
    
    FetchMessages --> BatchProcess[BatchProcessor.processAllBatches]
    BatchProcess --> DualFetch[DualRealtimeCommunicator.fetchMessagesFromBothSystems]
    DualFetch --> PubNubFetch[Fetch from PubNub]
    DualFetch --> ChatFetch[Fetch from Chat]
    PubNubFetch --> CombineResults[Combine Results]
    ChatFetch --> CombineResults
    
    CombineResults --> Compare[ComparisonEngine.compare]
    Compare --> Match[MessageMatcher.matchMessages]
    Match --> TimetokenMatch{Timetoken Match?}
    TimetokenMatch -->|Yes| Matched[Matched Messages]
    TimetokenMatch -->|No| FuzzyMatch[FuzzyMatcher.findMatch]
    FuzzyMatch --> Matched
    
    Matched --> ContentCompare[ContentComparator.compareContent]
    Matched --> OrderingValidate[OrderingValidator.validate]
    Matched --> MetricsCalc[MetricsCalculator.calculateMetrics]
    
    ContentCompare --> Results[Comparison Results]
    OrderingValidate --> Results
    MetricsCalc --> Results
    
    Results --> EmitMetrics[MetricsEmitter.emitComparisonMetrics]
    EmitMetrics --> CheckThresholds[AlertManager.checkThresholds]
    CheckThresholds --> EmitAlerts[Emit Alerts if Violations]
    EmitAlerts --> BatchSummary[MetricsEmitter.emitBatchSummary]
    BatchSummary --> Stop
    
    TeamInterval --> RefreshTeams
```

### Class Dependencies

```mermaid
classDiagram
    class Application {
        +start()
    }
    
    class ComparisonScheduler {
        -teamDiscoveryService: ITeamDiscoveryService
        -messageFetcherService: IMessageFetcherService
        -comparisonEngine: IComparisonEngine
        -metricsEmitter: IMetricsEmitter
        +start()
        +runManualComparison()
        -_runComparison()
        -_compareTeam()
    }
    
    class TeamDiscoveryService {
        -teamsDAL: ITeamsDAL
        -teamScanner: TeamScanner
        -teamCache: TeamCache
        +refreshTeams()
        +getCachedTeams()
    }
    
    class TeamScanner {
        +scanTeams()
        +getTeamsByIds()
    }
    
    class TeamCache {
        +setTeams()
        +getTeams()
        +size()
    }
    
    class MessageFetcherService {
        -dualRealtimeCommunicator: IDualRealtimeCommunicator
        -batchProcessor: BatchProcessor
        +fetchMessages()
        +fetchMessagesForTeams()
        +calculateTimeWindow()
    }
    
    class DualRealtimeCommunicator {
        -pubnubCommunicator: IRealtimeCommunicationsService
        -chatServiceCommunicator: IRealtimeCommunicationsService
        +fetchMessagesFromBothSystems()
        +fetchLastMessagesByCount()
    }
    
    class BatchProcessor {
        +processAllBatches()
    }
    
    class ComparisonEngine {
        -messageMatcher: MessageMatcher
        -contentComparator: ContentComparator
        -orderingValidator: OrderingValidator
        -metricsCalculator: MetricsCalculator
        +compare()
        -_findContentMismatches()
    }
    
    class MessageMatcher {
        -fuzzyMatcher: FuzzyMatcher
        +matchMessages()
    }
    
    class FuzzyMatcher {
        +findMatch()
    }
    
    class ContentComparator {
        +areEqual()
        +compareContent()
    }
    
    class OrderingValidator {
        +validate()
    }
    
    class MetricsCalculator {
        +calculateMessageCountDiscrepancy()
        +calculateCoverage()
        +calculateContentMismatchRate()
        +calculateLatencyDifferences()
    }
    
    class MetricsEmitter {
        -alertManager: AlertManager
        -loggerFormatter: LoggerFormatter
        +emitComparisonMetrics()
        +emitBatchSummary()
    }
    
    class AlertManager {
        +checkThresholds()
        +emitAlerts()
    }
    
    class LoggerFormatter {
        +formatComparisonResult()
        +logComparisonResult()
    }
    
    Application --> ComparisonScheduler
    ComparisonScheduler --> TeamDiscoveryService
    ComparisonScheduler --> MessageFetcherService
    ComparisonScheduler --> ComparisonEngine
    ComparisonScheduler --> MetricsEmitter
    
    TeamDiscoveryService --> TeamScanner
    TeamDiscoveryService --> TeamCache
    TeamDiscoveryService --> ITeamsDAL
    
    MessageFetcherService --> DualRealtimeCommunicator
    MessageFetcherService --> BatchProcessor
    
    ComparisonEngine --> MessageMatcher
    ComparisonEngine --> ContentComparator
    ComparisonEngine --> OrderingValidator
    ComparisonEngine --> MetricsCalculator
    
    MessageMatcher --> FuzzyMatcher
    
    MetricsEmitter --> AlertManager
    MetricsEmitter --> LoggerFormatter
```

## Key Features

- **Zero Teams Service Changes**: Operates independently without requiring Teams service modifications
- **Dual-System Comparison**: Fetches from both PubNub and Chat in parallel
- **Comprehensive Validation**: Compares all dimensions (count, content, ordering, coverage, latency)
- **Configurable Scope**: Supports manual team selection or automatic discovery
- **Threshold-Based Alerting**: Emits metrics and triggers alerts on discrepancies

## Configuration

The service is configured via feature flags:

```json
{
  "chat-comparison-config": {
    "enabled": true,
    "team_discovery_interval_minutes": 30,
    "polling_interval_minutes": 15,
    "polling_time_window_minutes": 20,
    "batch_size": 50,
    "max_messages_per_fetch": 100,
    "team_ids_override": []
  },
  "chat-comparison-thresholds": {
    "message_count_discrepancy_percent": 5,
    "message_count_discrepancy_absolute": 10,
    "content_mismatch_rate_percent": 1,
    "ordering_violations_count": 0,
    "coverage_percentage_min": 90,
    "latency_diff_ms_max": 5000,
    "api_failure_rate_percent": 5
  }
}
```

## Metrics

The service emits the following metrics:

- `chat_comparison.message_count_discrepancy` - Absolute difference in message counts
- `chat_comparison.content_mismatch_rate` - Percentage of content mismatches
- `chat_comparison.ordering_violations` - Count of ordering differences
- `chat_comparison.coverage_percentage` - Coverage of Chat vs PubNub messages
- `chat_comparison.latency_diff_ms` - Latency difference between systems
- `chat_comparison.chat_missing_messages` - Messages in PubNub but not Chat
- `chat_comparison.pubnub_missing_messages` - Messages in Chat but not PubNub (CRITICAL)

## Running Locally

```bash
npm install
AWS_PROFILE=moonactive-ci npm start
```

## Testing

```bash
npm test
npm run test:integration
```

## Deployment

The service is deployed as a Kubernetes consumer service. See `k8s/deployment.yaml` for configuration.
