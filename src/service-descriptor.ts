import ComparisonEngine from './modules/comparison-engine/comparison-engine';
import MessageFetcherService from './modules/message-fetcher/message-fetcher-service';
import MessageMatcher from './modules/message-matcher/message-matcher';
import MetricsEmitter from './modules/metrics-alerting/metrics-emitter';
import TeamDiscoveryService from './modules/team-discovery/team-discovery-service';
import ComparisonScheduler from './services/comparison-scheduler';
import DualRealtimeCommunicator from './services/dual-realtime-communicator';
import ComparisonRoute from './routes/comparison-route';

export = {
  modulesDescriptor: [
    {
      module: '@moonactive/moonactive-logger',
      name: 'loggerManager',
    },
    {
      module: '@moonactive/moonactive-secret-manager',
      name: 'secretManager',
    },
    {
      module: '@moonactive/alerts',
      name: 'alerts',
    },
    {
      module: '@moonactive/moonactive-feature-config',
      name: 'featureConfig',
    },
    {
      module: DualRealtimeCommunicator,
      name: 'dualRealtimeCommunicator',
    },
    {
      module: TeamDiscoveryService,
      name: 'teamDiscoveryService',
    },
    {
      module: MessageFetcherService,
      name: 'messageFetcherService',
    },
    {
      module: MessageMatcher,
      name: 'messageMatcher',
    },
    {
      module: ComparisonEngine,
      name: 'comparisonEngine',
    },
    {
      module: MetricsEmitter,
      name: 'metricsEmitter',
    },
    {
      module: ComparisonScheduler,
      name: 'comparisonScheduler',
    },
    {
      module: ComparisonRoute,
      name: 'comparisonRoute',
    },
  ],
  serverDescriptor: {
    module: '@moonactive/moonactive-server',
    name: 'server',
    routes: [
      {
        path: '/api/v1/comparison/run',
        method: 'post',
        handler: 'comparisonRoute.runComparison',
      },
    ],
  },
};
