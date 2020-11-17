import type { Serverless } from 'serverless/aws';

const DYNAMODB_TABLES = ['short-link', 'short-link-permissions'];

const serverlessConfiguration: Serverless = {
  service: {
    name: 'link-shortener',
  },
  frameworkVersion: '>=1.20.2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    },
    'serverless-offline': {
      httpPort: 3001,
    },
    dynamodb: {
      stages: [
        'dev'
      ],
      start: {
        port: 3030,
        inMemory: true,
        migrate: true,
        seed: true,
      },
      seed: {
        development: {
          sources: [{
            table: 'short-link',
            sources: ['./dynamo/short-link.json']
          }]
        }
      },
    }
  },
  plugins: [
    'serverless-webpack',
    'serverless-dynamodb-local',
    'serverless-offline',
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    region: "ap-northeast-1",
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      DYNAMODB_TABLES: DYNAMODB_TABLES.join(", "),
    },
    iamRoleStatements: DYNAMODB_TABLES.map((tableName) => { return {
      Effect: 'Allow',
      Action: [
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      Resource: `arn:aws:dynamodb:\${opt:region, self:provider.region}:*:table/${tableName}`
    }}),
  },
  resources: {
    Resources: {
      ShortLinkTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "short-link",
          AttributeDefinitions: [{
            AttributeName: "id",
            AttributeType: "S",
          }],
          KeySchema: [{
            AttributeName: "id",
            KeyType: "HASH",
          }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 3,
            WriteCapacityUnits: 3,
          }
        }
      },
      ShortLinkPermissionsTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "short-link-permissions",
          AttributeDefinitions: [{
            AttributeName: "sessionId",
            AttributeType: "S",
          }, {
            AttributeName: "linkId",
            AttributeType: "S",
          }],
          KeySchema: [{
            AttributeName: "sessionId",
            KeyType: "HASH",
          }, {
            AttributeName: "linkId",
            KeyType: "RANGE",
          }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 2,
            WriteCapacityUnits: 2,
          }
        }
      },
    }
  },
  functions: {
    admin: {
      handler: 'handler.admin',
      events: [
        {
          http: {
            method: 'get',
            path: 'l/admin',
          }
        }
      ]
    },
    hello: {
      handler: 'handler.hello',
      events: [
        {
          http: {
            method: 'get',
            path: 'l/hello',
          }
        }
      ]
    },
    redirect: {
      handler: 'handler.redirect',
      events: [
        {
          http: {
            method: 'get',
            path: 'l/{id+}'
          }
        }
      ]
    }
  }
}

module.exports = serverlessConfiguration;
