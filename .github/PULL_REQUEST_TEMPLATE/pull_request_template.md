# Pull Request

## Summary

- 

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Infrastructure/CI

## Target Branch

- [ ] This PR targets `dev`
- [ ] This is a release PR from `dev` to `main`

## Checklist

- [ ] Branch was created from the latest `dev`
- [ ] No direct changes are being pushed to `main`
- [ ] No direct changes are being pushed to `dev`
- [ ] `npm run lint` passes, or failures are documented as pre-existing
- [ ] `npm run build` passes, or failures are documented as pre-existing
- [ ] `npm run smoke:critical` passes, or is documented as not relevant
- [ ] `npm run smoke:auth-checkout` passes, or is documented as not relevant
- [ ] `npm run smoke:admin-api` passes, or is documented as not relevant
- [ ] `npm run smoke:chat-api` passes, or is documented as not relevant
- [ ] `npm run smoke:api-security` passes, or is documented as not relevant
- [ ] WebSocket server builds if `ws-server/` changed
- [ ] Prisma migration is included if the schema changed
- [ ] Cache invalidation is updated if cached data changed
- [ ] Realtime events are published after DB writes when relevant
- [ ] Auth/role ownership checks are covered for protected resources
- [ ] File upload/download limits and validation are considered when relevant
- [ ] Manual QA notes are included for user-facing or payment/order changes
- [ ] Staging/rollback notes are included for deployment, schema, payment, license, auth, WebSocket, or storage changes

## Manual QA

- 

## Deployment Notes

- 
