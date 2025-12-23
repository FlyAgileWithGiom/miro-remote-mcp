# Kubernetes Deployment Guide - miro-mcp

This service is deployed to Kubernetes via GitOps using ArgoCD.

## Quick Deploy

### To Dev Environment

```bash
git tag dev-$(date +%Y%m%d)
git push origin dev-$(date +%Y%m%d)
```

### To Production

```bash
git tag v1.2.3
git push origin v1.2.3
```

## Documentation

For complete deployment instructions, see the centralized GitOps documentation:

- **[Release Guide](https://github.com/FlyAgileWithGiom/mcp-infra-platform/blob/main/docs/RELEASE-GUIDE.md)**
- **[GitOps Workflow](https://github.com/FlyAgileWithGiom/mcp-infra-platform/blob/main/docs/GITOPS-WORKFLOW.md)**

## Service-Specific Notes

### Monitoring

```bash
# Check pod status
kubectl get pods -n mcp-gateway -l app=miro-mcp

# View logs
kubectl logs -n mcp-gateway deployment/miro-mcp -f
```

### Troubleshooting

See common troubleshooting steps in the [Release Guide](https://github.com/FlyAgileWithGiom/mcp-infra-platform/blob/main/docs/RELEASE-GUIDE.md#troubleshooting).

### Local Development

For local development without Kubernetes:

```bash
npm install
npm run build
npm run dev
```

See main README.md for Claude Desktop configuration.
