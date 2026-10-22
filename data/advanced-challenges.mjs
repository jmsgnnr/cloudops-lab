import { item } from "./question-utils.mjs";

// Independent original scenarios. SAP-C02 and DOP-C02 are study topics,
// not official AWS exam questions or claims of exam equivalence.
// Each original advanced scenario points to a claim-specific official technical
// reference, rather than a broad exam guide. Terraform references use
// HashiCorp docs; build-attestation provenance uses official GitHub docs;
// other technical claims use AWS service documentation.
export const ADVANCED_REFERENCES = Object.freeze({
  "sapx-01": "https://docs.aws.amazon.com/controltower/latest/controlreference/ou-region-deny.html",
  "sapx-02": "https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html",
  "sapx-03": "https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html",
  "sapx-04": "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html",
  "sapx-05": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html",
  "sapx-06": "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorOriginGroups.html",
  "sapx-07": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html",
  "sapx-08": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html",
  "sapx-09": "https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html",
  "sapx-10": "https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-asp-net-web-forms/ha-scaling.html",
  "sapx-11": "https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html",
  "sapx-12": "https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-transit-vif-for-gateway.html",
  "dopx-01": "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html",
  "dopx-02": "https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerImage.html",
  "dopx-03": "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html",
  "dopx-04": "https://developer.hashicorp.com/terraform/language/state",
  "dopx-05": "https://developer.hashicorp.com/terraform/language/state/backends",
  "dopx-06": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html",
  "dopx-07": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html",
  "dopx-08": "https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html",
  "dopx-09": "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html",
  "dopx-10": "https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html",
  "dopx-11": "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
  "dopx-12": "https://docs.github.com/en/actions/concepts/security/artifact-attestations",
  "secx-01": "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html",
  "secx-02": "https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html",
  "secx-03": "https://docs.aws.amazon.com/inspector/latest/user/findings-types.html",
  "secx-04": "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html",
  "secx-05": "https://docs.aws.amazon.com/solutions/latest/automated-forensics-orchestrator-for-amazon-ec2/forensic-memory-and-disk-acquisition-service.html",
  "secx-06": "https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_DisableRule.html",
  "secx-07": "https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html",
  "secx-08": "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html",
  "secx-09": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html",
  "secx-10": "https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html",
  "secx-11": "https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html",
  "secx-12": "https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html"
});

export const ADVANCED_REFERENCE_SUPPLEMENTS = Object.freeze({
  "sapx-02": "https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/private-nat-gateway.html",
  "dopx-03": "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
  "secx-02": "https://docs.aws.amazon.com/inspector/latest/user/findings-types.html"
});

function advancedItem(id, track, domain, stem, options, answers, explanation) {
  const reference = ADVANCED_REFERENCES[id];
  if (!reference) throw new Error("Missing advanced technical reference for " + id);
  const base = { ...item(id, track, domain, "advanced", stem, options, answers, explanation), reference };
  const referenceSupplement = ADVANCED_REFERENCE_SUPPLEMENTS[id];
  return referenceSupplement ? { ...base, referenceSupplement } : base;
}
const a = (id, domain, stem, options, answers, explanation) =>
  advancedItem(id, "architecture", domain, stem, options, answers, explanation);
const d = (id, domain, stem, options, answers, explanation) =>
  advancedItem(id, "devops", domain, stem, options, answers, explanation);
const s = (id, domain, stem, options, answers, explanation) =>
  advancedItem(id, "fieldsecurity", domain, stem, options, answers, explanation);

export const architectureChallenges = [
  a("sapx-01", "Organizational Complexity", "An organization must deny use of an unapproved AWS Region across member accounts, including administrators, while retaining approved central services. Which control is most appropriate?",
    ["Attach an SCP with regional deny conditions and documented exceptions to applicable organizational units","Apply regional Deny statements only to the central SSO permission sets while retaining member-account administrator policies","Deploy AWS Config rules for disallowed Regions and remediate findings after resources have already been created","Attach the regional SCP only to existing application accounts and allow new member accounts to inherit a separate unrestricted OU"], [0],
    "An applicable SCP can constrain member-account principals even when their identity policies allow an action. Region restrictions need careful exceptions for global services; AWS Config detection after creation or IAM permissions scoped only to selected roles cannot enforce the same account-wide boundary."),
  a("sapx-02", "Organizational Complexity", "Two acquired companies each use 10.0.0.0/16 in production VPCs. Workloads must communicate without renumbering immediately. Which designs can bridge the overlap safely? Select TWO.",
    ["Use an application-layer proxy with non-overlapping endpoints","Use a deliberately designed translation layer with non-overlapping address presentation","Advertise both identical VPC prefixes to one transit gateway route table and rely on static route priority to choose the destination","Use overlapping-CIDR VPC peering with more-specific host routes on both sides, without address translation"], [0,1],
    "Overlapping networks cannot be made unambiguous merely by peering or transit gateway propagation. Proxy or NAT/translation patterns can bridge selected traffic while a longer-term renumbering plan is prepared."),
  a("sapx-03", "Organizational Complexity", "A central networking account operates a transit gateway for many application accounts. New VPCs must be attached with governed sharing and separate production and development routing. What is the strongest starting architecture?",
    ["Share the transit gateway using AWS RAM, control attachment acceptance, and use separate TGW route tables","Share a single transit gateway through RAM but propagate every attachment into one route table shared by both environments","Deploy one transit gateway per application account, chain inter-Region TGW peerings and avoid centrally governed attachment acceptance","Share the central transit gateway while relying only on application security groups instead of separating routing domains"], [0],
    "RAM shares a transit gateway across accounts without transferring ownership. Attachment controls and explicit route-table segmentation prevent accidental cross-environment reachability."),
  a("sapx-04", "New Solutions", "Private workloads in VPCs must resolve on-premises private DNS names, and on-premises clients must resolve private Route 53 zones. Which architecture covers both directions?",
    ["Route 53 Resolver outbound endpoints and forwarding rules plus inbound endpoints for on-premises queries","Configure only outbound Resolver endpoints and forwarding rules, expecting on-premises clients to query private hosted zones through them","Configure only inbound Resolver endpoints, expecting workloads in the VPC to forward private queries toward on-premises DNS","Replicate on-premises records into public Route 53 hosted zones and use split-horizon names without any hybrid Resolver endpoints"], [0],
    "Outbound Resolver endpoints forward VPC queries to on-premises resolvers, while inbound endpoints receive on-premises queries for AWS private resolution. One direction does not cover the other."),
  a("sapx-05", "New Solutions", "A checkout service receives unpredictable bursts. Orders must be accepted quickly and processed at-least-once, with failed messages available for investigation. Which design best fits?",
    ["Persist requests in SQS, process with idempotent workers, and configure a dead-letter queue","Publish order events to EventBridge with target retries but leave duplicate billing calls unguarded and omit a dead-letter destination","Use an SNS-to-Lambda integration with standard retry behavior but no durable failure queue or business-operation idempotency","Send each accepted order to a single fixed-capacity Kinesis shard and assume consumer checkpoints guarantee exactly-once processing"], [0],
    "SQS absorbs bursts and supports retries, but delivery can repeat. Idempotent consumers and a DLQ protect against duplicates and poison messages; event routing or stream checkpointing alone does not guarantee exactly-once business operations."),
  a("sapx-06", "New Solutions", "A globally distributed read-heavy site needs fast static assets and resilience to one origin failure. Which measures directly address this? Select TWO.",
    ["Cache eligible assets with CloudFront near viewers","Configure a supported CloudFront origin failover group for eligible requests","Use Global Accelerator endpoint groups for the single regional origin, assuming edge routing also caches every static response","Choose Route 53 geolocation routing to one regional origin, without an alternate healthy origin or edge content cache"], [0,1],
    "Edge caching reduces repeated origin trips, and origin failover helps on supported requests and failure conditions. Neither choice guarantees zero-downtime writes or a globally consistent database."),
  a("sapx-07", "New Solutions", "An application requires cross-Region read locality for a relational database, but stakeholders also demand zero data loss during an unplanned Region failure. What should the architect communicate?",
    ["Cross-Region asynchronous replication can lag; zero RPO is not guaranteed without a separately proven synchronous strategy","Guarantee zero RPO for an unplanned failover because Aurora Global Database secondary promotion automatically catches up asynchronous writes","Promise zero RPO with scheduled cross-Region snapshot copy as long as backup intervals are no longer than five minutes","Combine intra-Region Multi-AZ failover with cross-Region DNS failover and assume it synchronously preserves every remote write"], [0],
    "Asynchronous cross-Region replicas may be behind the writer when disaster strikes. The RPO must be stated explicitly and tested rather than implying zero loss from global replication."),
  a("sapx-08", "Continuous Improvement", "A large workload sends heavy traffic to S3 through a NAT gateway. Security requires private AWS-network paths and cost teams want to reduce NAT processing. What should be evaluated first?",
    ["An S3 gateway VPC endpoint with route-table and access-policy review","Create an S3 interface VPC endpoint without comparing per-AZ and per-GB charges or checking whether the private route uses it","Move the NAT gateway to another Availability Zone while retaining S3 requests through the NAT and ignoring cross-AZ processing costs","Add an S3 PrivateLink interface endpoint but keep the existing S3 route selection directed to the NAT gateway"], [0],
    "An S3 gateway endpoint can route supported S3 access without NAT gateway processing and avoids public-address requirements. Confirm routing, endpoint policy and cross-Region constraints first."),
  a("sapx-09", "Continuous Improvement", "A multi-AZ application experiences p99 latency spikes while mean latency looks stable. Which data would most directly support identifying the bottleneck?",
    ["Per-hop tracing with percentile latency, downstream saturation and error metrics","Aggregate endpoint latency into account-wide one-minute means without collecting per-hop timings or downstream error rates","Measure ENI bytes from VPC Flow Logs and treat accepted packet counts as a complete trace of slow application dependencies","Review database wait events alone while excluding request spans and saturation metrics for non-database downstream services"], [0],
    "High-percentile latency can reveal tail amplification hidden by an average. Distributed traces and service saturation/error signals help isolate the slow downstream dependency."),
  a("sapx-10", "Continuous Improvement", "A three-tier application has durable database storage but stores session state on a single application instance. Scaling or replacement logs users out. Which changes should be prioritized? Select TWO.",
    ["Move session state into a suitable shared or managed data store","Make application instances replaceable and validate horizontal scaling","Enable load-balancer session affinity so each browser keeps local state on one replaceable application instance","Scale out additional application instances while persisting each user's session in the original instance's ephemeral directory"], [0,1],
    "Externalizing shared state and designing stateless, disposable application instances permits scaling and failure recovery. Vertical scaling alone keeps a single-instance dependency."),
  a("sapx-11", "Migration and Modernization", "A company is migrating an active on-premises relational database with hours, not days, of permitted cutover downtime. What combination best minimizes the synchronization gap?",
    ["Perform initial migration and then ongoing change data capture until a controlled cutover","Run AWS DMS full-load migration once, then allow unrestricted source writes to continue until cutover without change capture","Use nightly database snapshots with asynchronous restore while assuming updates since the latest snapshot will replay automatically","Migrate only the schema and use a DNS switchover to synchronize transactions written during the intervening hours"], [0],
    "Bulk migration followed by CDC keeps the target converging as source transactions continue. Schema conversion, replication lag, consistency checks and rollback still need explicit cutover plans."),
  a("sapx-12", "Migration and Modernization", "A large enterprise needs private hybrid connectivity from on-premises networks to many VPCs through a central transit gateway. Which Direct Connect construct best aligns?",
    ["A transit virtual interface through a Direct Connect gateway associated with the transit gateway","Connect a private virtual interface to one spoke VPC virtual private gateway and assume its VPC peering links provide transitive connectivity","Create a separate private virtual interface and virtual private gateway per VPC, bypassing the central transit gateway and multiplying routes","Terminate a public virtual interface on a Direct Connect gateway and associate it directly with a transit gateway for private routing"], [0],
    "A transit VIF with Direct Connect gateway supports TGW-oriented hybrid connectivity. Private VIF targets a VGW/DX gateway path, not an attachment directly to a TGW.")
];

export const devopsChallenges = [
  d("dopx-01", "SDLC Automation", "A production service must deploy a new version, watch a latency alarm, and automatically return traffic to the old version if deployment health degrades. Which approach is strongest?",
    ["A blue/green release with health checks and alarm-driven rollback","Deploy canary instances and monitor latency alarms, but require an operator to perform any rollback after unhealthy traffic is promoted","Use blue/green deployment but terminate the blue environment before shifting traffic, leaving no tested rollback target","Perform an in-place rolling replacement and continue promotion after CloudWatch alarm thresholds are breached"], [0],
    "Blue/green deployment preserves a known-good target and supports measured traffic shifting and rollback. Deleting the old target or continuing rollout after unhealthy alarms removes the automatic recovery path."),
  d("dopx-02", "SDLC Automation", "The same container image passed testing but production fetched a newer image with an unchanged tag. Which control most directly prevents this class of drift?",
    ["Deploy an immutable image digest promoted across environments","Promote a unique semantic version tag that registry administrators can overwrite, without comparing its resolved image digest","Pin only the Dockerfile base-image digest but rebuild the deployable application artifact independently in production","Verify the artifact's build signature while still pulling whichever image the moving stable tag names during release"], [0],
    "Pinning and promoting an image digest ensures production pulls the exact artifact that was tested. Mutable tags and stage-specific rebuilds undermine artifact identity."),
  d("dopx-03", "SDLC Automation", "A team wants to minimize privileged CI credentials while deploying to AWS from a trusted external OIDC-capable CI provider. Which controls should they implement? Select TWO.",
    ["Federate short-lived credentials through STS with constrained trust conditions","Limit the deployment role's actions and resource scope","Trust any OIDC token with the expected provider audience while omitting repository, environment and branch restrictions","Use OIDC-federated STS credentials but grant the resulting deployment role wildcard administrator actions"], [0,1],
    "OIDC federation avoids persistent CI secrets, while issuer, audience and repository/branch claim conditions restrict who can assume the role. Least-privilege IAM then limits impact."),
  d("dopx-04", "Configuration and IaC", "A critical stack was changed manually outside Infrastructure as Code. What process best reconciles it without surprising production?",
    ["Detect drift, assess the impact, and either import/adopt the change or restore the declared state through review","Automatically reapply the last Terraform plan whenever drift is detected, even when stateful resources would be replaced","Run a refresh-only state update and treat the refreshed state as approval to keep undocumented production changes","Suppress drift detection until the next scheduled release instead of determining whether the manual change is intentional"], [0],
    "Drift detection reveals mismatches, but remediation requires explicit ownership, change review and safe rollout. Blind re-creation may destroy stateful resources."),
  d("dopx-05", "Configuration and IaC", "Multiple teams apply Terraform concurrently against a production environment. What controls are needed to avoid conflicting updates? Select TWO.",
    ["Use a shared remote state backend with locking support","Serialize approvals and apply jobs for the same state/workspace","Store Terraform plans in a central artifact bucket while allowing developers to apply independent local state files against the same resources","Run a successful Terraform plan check for every merge but let multiple approved deployment jobs apply the same state simultaneously"], [0,1],
    "State locking and a serialized deployment pipeline protect a shared desired state from competing writes. Concurrent unlocked applies can corrupt expectations and create real infrastructure drift."),
  d("dopx-06", "Resilient Solutions", "SQS retries occasionally deliver the same order event twice. A consumer currently creates two charges. What is the primary application-level fix?",
    ["Make the charge operation idempotent using a stable business request key","Move the event queue to SQS FIFO and assume its finite deduplication window makes downstream payment operations exactly once","Set a long SQS visibility timeout without guarding repeated charge requests after consumer crashes or redelivery","Use a transactional outbox for newly published events but continue accepting duplicate previously consumed business operations"], [0],
    "Standard queues can deliver at least once. Idempotency recorded at the business operation boundary prevents duplicate financial actions, while timeout tuning alone cannot guarantee uniqueness."),
  d("dopx-07", "Resilient Solutions", "An RDS Multi-AZ primary becomes unavailable. Which expectation is appropriate when designing application recovery?",
    ["The service can fail over to a standby, but clients may need to retry connections and transactions","Cache the current primary database IP in the application so reconnects can bypass RDS endpoint DNS changes during failover","Rely only on low DNS TTL for the database endpoint while omitting client transaction and connection retry behavior","Treat a separately configured read replica as the existing Multi-AZ synchronous standby and route new writes to it immediately"], [0],
    "Multi-AZ improves availability but does not make client connections immortal. Applications must use the proper endpoint and handle disconnects, retries and transaction outcomes safely."),
  d("dopx-08", "Monitoring and Logging", "Request failures appear only at one downstream service, yet frontend error rates fluctuate. Which observability combination best reveals the causal path?",
    ["Correlated trace IDs, structured logs, request/error metrics and dependency tracing","Collect detailed frontend traces without propagating trace context across downstream service boundaries","Aggregate all services into structured logs without consistent request IDs linking related events across components","Alert only on overall frontend 5xx percentages without collecting downstream latency or dependency errors"], [0],
    "End-to-end correlation connects failures across service boundaries. Logs establish detail, metrics quantify impact, and traces explain which downstream hop caused latency or errors."),
  d("dopx-09", "Monitoring and Logging", "A deployment increases p95 request duration from 180 ms to 900 ms without materially changing average CPU. Which alarms are most informative? Select TWO.",
    ["A service-level p95 or p99 latency threshold","Downstream timeout/error-rate and saturation indicators","Alarm on fleet-wide mean CPU utilization alone because this deployment did not change that aggregate metric","Alarm only on API Gateway client-side 4xx responses and exclude downstream timeouts or latency percentiles"], [0,1],
    "Latency percentiles plus dependency errors and saturation reveal customer-facing regressions that average CPU obscures. Business-impact signals should drive rollback decisions."),
  d("dopx-10", "Incident and Event Response", "An auto-remediation Lambda repeatedly restarts healthy instances after receiving duplicate operational events. What should the response workflow add?",
    ["Event deduplication, bounded retries, safety checks and an auditable manual override","Limit Lambda reserved concurrency to one while allowing repeated delivery of the same event to restart the same instance","Set the EventBridge target retry count to zero and assume upstream publishers cannot emit duplicate operational events","Increase the CPU threshold before each restart but omit event correlation, execution bounds, and an operator stop control"], [0],
    "Automations must be idempotent and bounded with clear preconditions and escalation. Duplicate events are normal in many event-driven architectures and must not trigger repeated destructive remediation."),
  d("dopx-11", "Security and Compliance", "A CI runner needs to deploy to a specific production service, not administer the entire AWS account. Which IAM approach follows least privilege?",
    ["Assume a dedicated role restricted to the required deployment actions and resources","Federate the runner through OIDC but grant the assumed deployment role broad account-level administrator privileges","Use short STS sessions with an unrestricted trust policy and rely on human operators to constrain deployment API calls","Rotate a shared CI user's long-lived key regularly while retaining wildcard write permissions across all services"], [0],
    "Separate scoped deployment roles limit the blast radius of compromised automation. Admin grants and long-lived repository secrets expose far more than the release actually needs."),
  d("dopx-12", "Security and Compliance", "Before promoting an application artifact, the team needs confidence it is the signed build from an approved pipeline. What is the strongest verification step?",
    ["Validate the signed artifact provenance against a trusted issuer and expected source/revision","Verify that an artifact has any valid cryptographic signature without verifying the expected signer, repository or source revision","Compare the artifact digest to a manifest produced by the same untrusted runner without independently trusted provenance","Require a green CI pipeline check but deploy a mutable latest tag without validating which exact signed artifact it resolves to"], [0],
    "Verifiable artifact provenance ties a digest to the trusted build process and intended source. Names, tags and bucket location do not independently establish artifact integrity.")
];

export const securityFieldChallenges = [
  s("secx-01", "Detection and Triage", "CloudTrail shows PutObject because a write-only S3 object data-event selector covers the bucket; standard management events are also enabled. Investigators need to identify principals who downloaded sensitive objects last week. What logging gap matters?",
    ["Read-level S3 object data events, including GetObject, needed to be enabled for the relevant bucket or prefix before the incident","Query a CloudTrail Lake event store configured only for management events and assume object-level GetObject calls are present","Enable S3 server access logging after the incident and treat the resulting logs as a retrospective record of last week's readers","Use Macie classification findings to attribute previous object downloads to IAM principals without API event history"], [0],
    "A write-only S3 object data-event selector can capture PutObject but not GetObject reads. Historical download attribution requires a read-enabled selector for the relevant bucket or prefix, or an equivalent event data store, already active when the operation occurred. Logging is not retroactive."),
  s("secx-02", "Detection and Triage", "An Inspector finding reports an unpatched package, while GuardDuty reports a suspicious credential access pattern. What distinguishes the signals?",
    ["Inspector identifies exposure/vulnerabilities; GuardDuty is primarily threat-detection telemetry","Treat an Inspector package-vulnerability finding as confirmed exploitation whenever public exploit code is available","Assume a GuardDuty anomalous API finding proves the instance has the package version reported in an unrelated Inspector scan","Use an Inspector risk score as a substitute for validating whether the behavior in the GuardDuty alert actually happened"], [0],
    "Inspector and GuardDuty answer different questions. A vulnerable package is not proof of exploitation, and a suspicious behavior finding requires context and additional validation."),
  s("secx-03", "Detection and Triage", "A third-party classifier downgrades every critical Inspector vulnerability because a host has no public IP. What is the appropriate analyst response?",
    ["Check actual reachability, exploitability, workload role and compensating controls before changing severity","Suppress every critical finding for private-addressed hosts without checking peering, lateral movement or identity paths","Use a restrictive inbound security group as conclusive evidence against package exploitability while ignoring workload role and outbound access","Reprioritize based solely on CVSS base score, without validating vulnerable version, reachability or compensating controls"], [0],
    "Private addressing alone does not remove lateral movement, vulnerable dependencies or identity-based exposure. Evidence-based context can change priority, not erase source severity without justification."),
  s("secx-04", "Containment and Evidence", "An attacker used an assumed IAM role and may retain temporary role credentials. Changing the role policy stops some access, but the team needs a broad emergency session revocation. Which mechanism applies?",
    ["Apply the AWS-supported revoke-active-sessions pattern to deny credentials issued before a cutoff time","Shorten the role's maximum session duration for future assumptions and treat already issued temporary credentials as revoked","Edit the role trust policy to block new AssumeRole requests and assume existing authorized sessions end immediately","Remove the permissions for new role sessions but let previously issued sessions run until natural expiration without a cutoff deny"], [0],
    "Role sessions are temporary credentials; policy-based session revocation can explicitly deny older sessions. Credential response must consider all affected role paths and document the cutoff."),
  s("secx-05", "Containment and Evidence", "A live EC2 instance may contain volatile malware artifacts. The team plans an EBS snapshot and immediate termination. What important evidence concern should stop an automatic termination?",
    ["An EBS snapshot does not preserve RAM or every transient process/network artifact","Create an EBS root-volume snapshot and treat it as a complete record of volatile memory and active network sockets","Create an AMI with reboot disabled, terminate immediately, and assume in-memory process evidence is preserved","Collect CloudTrail management events only and assume they contain every process and loaded module from the terminated guest"], [0],
    "Disk snapshots preserve block-level disk state, not volatile memory. Collection order should be driven by evidence goals, legal requirements and containment risk before the instance is terminated."),
  s("secx-06", "Containment and Evidence", "A compromised Lambda function is being invoked continuously by an EventBridge rule. Investigators need to stop further execution while preserving code, configuration and logs. Which actions fit? Select TWO.",
    ["Disable the triggering EventBridge rule and assess any other invocation paths","Preserve function configuration, relevant versions and CloudWatch logs with documented access","Set Lambda reserved concurrency to zero but delete the function's CloudWatch log group during the same containment change","Disable the known EventBridge rule yet ignore other invocation sources and leave no copy of function versions or configuration"], [0,1],
    "Disabling identified triggers limits repeated invocation; preserving code and logs supports analysis. Other triggers and permissions need review, while deletion destroys useful evidence."),
  s("secx-07", "Identity and Key Control", "An IAM policy allows kms:Decrypt for a key in another AWS account, but the call is denied. What must also permit the cross-account operation?",
    ["The key's policy in the owning account, with any applicable grants and conditions","Add a KMS grant on the caller account's own key and assume it delegates Decrypt permission to a different owner's key","Expand the S3 bucket policy to allow the calling account and treat object read permissions as sufficient for the remote KMS key","Add an Organizations SCP Allow and identity permission boundary exception without authorizing the caller in the owning key policy"], [0],
    "Cross-account KMS operations require resource-side key policy authorization and caller-side permissions, subject to applicable policies. An identity-policy allow alone is insufficient."),
  s("secx-08", "Identity and Key Control", "A SaaS vendor requests role assumption in every customer account. Which safeguards reduce confused-deputy and overprivilege risks? Select TWO.",
    ["A unique customer-specific external ID checked in each role trust policy","A minimal vendor-assumable role with carefully scoped resource permissions","Require a single external ID reused across all customers to simplify vendor onboarding and avoid per-customer conditions","Trust the SaaS vendor's whole organization principal and grant wildcard actions because its service assumes roles briefly"], [0,1],
    "Unique external IDs help bind vendor requests to the intended customer; narrow permissions constrain impact. Neither control replaces vendor vetting or ongoing access reviews."),
  s("secx-09", "Identity and Key Control", "A member account administrator tries to allow an action that an applicable AWS Organizations SCP explicitly denies. What is the result?",
    ["The operation remains denied despite the identity-policy allow","Attach a narrower IAM permissions boundary to the principal and assume it cancels the applicable SCP explicit Deny","Use a resource-based policy allowing the principal and assume that Allow always overrides an explicit SCP Deny","Assume a different role in the same member account with broader identity permissions while leaving the applicable SCP unchanged"], [0],
    "SCPs define the maximum available permissions for affected principals and apply explicit denies before an identity-policy allow can succeed. A boundary, resource-based Allow or different role in the same member account cannot override an applicable SCP explicit Deny."),
  s("secx-10", "Network and Data Defense", "VPC Flow Logs show ACCEPT for a connection attempt, but clients report an application timeout. Which interpretation is sound?",
    ["Network acceptance does not prove the application completed a successful request","Use ACCEPT bytes in the VPC Flow Log as evidence that a complete HTTP response was returned by the service","Treat an accepted flow record as proof that TLS negotiation succeeded and the application handler produced a successful response","Infer the calling IAM principal and request path from network-level ACCEPT records without collecting request logs"], [0],
    "Flow Log ACCEPT reflects network-level handling at the capture point; application health can still fail due to listeners, backend errors, TLS, timing or downstream dependencies."),
  s("secx-11", "Network and Data Defense", "A centralized inspection VPC receives traffic from spoke VPCs through a transit gateway, but return packets bypass inspection and sessions fail. Which must the team validate? Select TWO.",
    ["Symmetric forward and return routing through intended inspection appliances","Transit gateway route-table association/propagation and appliance-mode requirements where applicable","Increase Gateway Load Balancer target capacity while keeping the current return-path route outside the inspection appliance","Enable appliance mode for the inspection attachment but leave the conflicting forward and return TGW routes unchanged"], [0,1],
    "Stateful inspection requires symmetric flows, and TGW route-table plus appliance-mode design affects appliance affinity. Capacity changes or appliance mode alone cannot repair a misrouted return packet path."),
  s("secx-12", "Network and Data Defense", "An S3 bucket permits objects with SSE-KMS but a cross-account processing role still cannot read them. Which checks should come first?",
    ["S3 access permissions and the KMS key policy/identity permissions for Decrypt","Grant cross-account s3:GetObject on the bucket and assume KMS authorization is inherited from the object permission","Add kms:Decrypt to the consumer identity policy alone without any corresponding permission from the owning key policy","Allow S3 via the VPC endpoint policy and assume endpoint authorization grants Decrypt permission on the remote KMS key"], [0],
    "Reading SSE-KMS objects requires both the necessary S3 permissions and KMS decrypt authorization. A bucket policy or VPC endpoint policy does not independently authorize KMS Decrypt.")
];

export const ADVANCED_QUESTIONS = Object.freeze([
  ...architectureChallenges, ...devopsChallenges, ...securityFieldChallenges
]);
