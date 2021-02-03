#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NlbProjectStack } from '../lib/nlb-project-stack';
import { Tags } from '@aws-cdk/core';

const app = new cdk.App();
const prod_account = app.node.tryGetContext('project')['account'];
const prod_region = app.node.tryGetContext('project')['region'];

const envPROD  = { account: prod_account, region: prod_region };
const ProductionStack = new NlbProjectStack(app, 'NlbProjectStack', { env: envPROD });
 
// Add a tag to all constructs in the stack
Tags.of(ProductionStack).add('StackType', 'TheBestCDK');
Tags.of(ProductionStack).add('ManagedBy', 'sepiainnovations.com');

