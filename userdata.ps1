<powershell>
Start-Transcript; 
Import-Module AWSPowerShell; 
# Install IIS
Enable-WindowsOptionalFeature -Online -NoRestart -FeatureName 'IIS-WebServerRole', 'IIS-WebServer', 'IIS-ManagementConsole';

# Set content
Set-Content C:\inetpub\wwwroot\Default.htm "<h1>Welcome to MyWeb </h1>"
$wc = New-Object System.Net.WebClient;
$instanceIdResult = $wc.DownloadString("http://169.254.169.254/latest/meta-data/instance-id")
$az = $wc.DownloadString("http://169.254.169.254/latest/meta-data/placement/availability-zone")
$amiid = $wc.DownloadString("http://169.254.169.254/latest/meta-data/ami-id")

Add-Content C:\inetpub\wwwroot\Default.htm "`r`nInstance-id: $instanceIdResult"
Add-Content C:\inetpub\wwwroot\Default.htm "`r`nAMI-id: $amiid"
Add-Content C:\inetpub\wwwroot\Default.htm "`r`nAvailability-zone: $az"

</powershell>
