

const userDataResponse = (user) => {
  return {
    user_data: {
      profile: {
        id: user.user_id,
        user_name: user.user_name,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        birth_date: user.birth_date,
        phone_number: user.phone_number,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      settings: {
        theme_mode: user.theme_mode,
        private_profile: user.private_profile,
        auth_with_google: user.auth_with_google,
      },
      organization: {
        id: user.org_id,
        unique_name: user.org_unique_name,
        org_name: user.org_name,
        org_logo_url: user.org_logo_url,
        org_member_role: user.org_member_role,
        org_member_since: user.org_member_since,
      },
      current_plan: {
        id: user.user_plan_id,
        plan_name: user.plan_name,
        client_type: user.client_type,
        details: user.plan_details || {},
      },
      current_plan_usage: {
        plan_id: user.usage_plan_id,
        plan_name: user.usage_plan_name,
        client_type: user.client_type,
        period_start: user.period_start,
        period_end: user.period_end,
        details: user.usage_details || {},
      },
    },
  };
};



module.exports = {
  // User data formatter
  userDataResponse,
};
