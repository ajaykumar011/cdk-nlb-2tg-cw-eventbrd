#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NlbProjectStack } from '../lib/nlb-project-stack';

const app = new cdk.App();
const envPROD  = { account: '304962413949', region: 'us-east-1' };
//const envDEV = { account: '304962413949', region: 'us-east-2' };

new NlbProjectStack(app, 'NlbProjectStack', { env: envPROD });
//new NlbProjectStack(app, 'NlbProjectStack', { env: envDEV});

