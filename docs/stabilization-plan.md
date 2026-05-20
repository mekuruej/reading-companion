# Mekuru Stabilization Plan

## Goal

For the next few weeks, avoid major new features. Focus on organizing, documenting, auditing, and making the app safer before wider student access.

## Allowed Work

- Documentation
- Security review
- Route/access review
- RLS review
- Input validation review
- Component extraction
- Helper/service/DAO organization
- Bug fixes
- Small UI fixes that do not change the flow

## Paused Work

- Major new features
- Major database redesigns
- Payment/access changes
- Full dictionary import
- Big stats redesigns
- Large page rewrites

## Refactor Rule

Refactor one page or feature at a time.

Do not change behavior unless the change is intentional and documented.

## Before/After Rule

For UI pages, take a screenshot before and after changes when possible.

## Safety Rule

After each cleanup task, run the app and confirm the original flow still works.

## Email Privacy Cleanup

Goal: Email should be treated as private account infrastructure, not profile identity.

Tasks:

✅ Removed full email display from main profile/manage page
✅ Removed the misleading Account Settings card
✅ Reduced unnecessary email exposure
✅ Kept public profile email-free
✅ Use username or display name instead of email for “signed in as” areas.
✅ Stop showing email unless the user is on a true private account settings page.
🟡 Audit whether profiles.email is actually needed
🟡 Eventually stop populating/remove profiles.email if nothing depends on it
🟡 Confirm relationships use user_id, not email