# Welcome to your CDK TypeScript project!

1. Active- Passive Setup: The setup of applications is as follows:
a) Network load balancer -- listener on port 8080 -- two target groups - primary(MyTG1) and secondary(MyTG2)
the traffic by default goes to primary TG based on the setting on the listener to send 100% traffic to primary.

b) When the primary instance goes down, we need to trigger a lambda to switch the traffic to secondary.

## Prerequisite
λ npm install -g aws-cdk
λ cdk --version
1.87.1 (build 9eeaa93)

λ npm install -g typescript
#Clone the Repository by using Gitclone and enter into the directory.
λ npm install

Install AWS Cli version2 by using below link:
https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html#cliv2-windows-install
download windows installer from above link and install aws cli (version2)

λ aws --version
aws-cli/2.1.23 Python/3.7.9 Windows/10 exe/AMD64 prompt/off

## Deploying
cdk bootstrap aws://<aws_account>:/<region> --profile <profile_name>
cdk ls
cdk synth --profile <profile_name>
cdk deploy --all --profile <profile_name>

## Functionality Check
Just terminate the Primary Instance and you will find the Listener is automatically modified and pointed to Secondary Target Group

## AWS Services used
Virtual Private Network
Network Load Balancer
EC2 (Windows Deployment with Userdata)
EventBridge (Cloudwatch) as Trigger
AWS Lambda (python function to change the NLB Listener Pointing)

## Other Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
