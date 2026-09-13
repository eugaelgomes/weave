import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveLegacyAuthInviteRedirect,
  resolveOrganizationAcceptInviteRedirect,
} from "./invite-auth-redirects.ts";

const SAMPLE_UUID = "078ce37f-ba69-4038-942e-a375f9580c4a";

test("resolveOrganizationAcceptInviteRedirect maps token to invite_token", () => {
  const result = resolveOrganizationAcceptInviteRedirect(
    "/workspace/accept-invite",
    SAMPLE_UUID
  );
  assert.deepEqual(result, {
    pathname: "/auth/",
    inviteToken: SAMPLE_UUID,
    deleteToken: true,
  });
});

test("resolveLegacyAuthInviteRedirect maps /auth?token=uuid without view", () => {
  const result = resolveLegacyAuthInviteRedirect({
    pathname: "/auth",
    token: SAMPLE_UUID,
    inviteToken: null,
    view: null,
  });
  assert.deepEqual(result, {
    pathname: "/auth/",
    inviteToken: SAMPLE_UUID,
    deleteToken: true,
  });
});

test("resolveLegacyAuthInviteRedirect does not rewrite account confirm links", () => {
  const result = resolveLegacyAuthInviteRedirect({
    pathname: "/auth",
    token: SAMPLE_UUID,
    inviteToken: null,
    view: "confirm",
  });
  assert.equal(result, null);
});

test("resolveLegacyAuthInviteRedirect does not rewrite password reset links", () => {
  const result = resolveLegacyAuthInviteRedirect({
    pathname: "/auth",
    token: SAMPLE_UUID,
    inviteToken: null,
    view: "reset-password",
  });
  assert.equal(result, null);
});

test("resolveLegacyAuthInviteRedirect skips when invite_token already present", () => {
  const result = resolveLegacyAuthInviteRedirect({
    pathname: "/auth",
    token: SAMPLE_UUID,
    inviteToken: SAMPLE_UUID,
    view: null,
  });
  assert.equal(result, null);
});

test("resolveLegacyAuthInviteRedirect skips non-uuid token values", () => {
  const result = resolveLegacyAuthInviteRedirect({
    pathname: "/auth",
    token: "not-a-uuid",
    inviteToken: null,
    view: null,
  });
  assert.equal(result, null);
});
