#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NlbProjectStack } from '../lib/nlb-project-stack';

const app = new cdk.App();
new NlbProjectStack(app, 'NlbProjectStack');
