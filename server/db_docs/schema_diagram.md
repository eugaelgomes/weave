# Diagrama do Banco de Dados

```mermaid
erDiagram
    %% Core Users & Auth
    users {
        uuid user_id PK
        string email
        string username
        string password
        uuid plan_id FK
        uuid org_id FK
    }

    tokens {
        serial token_id PK
        uuid user_id FK
        string type
    }

    sessions {
        varchar sid PK
        json sess
    }

    %% Plans & Billing
    plans {
        uuid plan_id PK
        string name
        float plan_value
    }

    plans_usage {
        uuid id PK
        uuid plan_id FK
        uuid user_id FK
        uuid org_id FK
    }

    plan_usage_history {
        uuid id PK
        uuid plan_usage_id FK
        uuid user_id FK
        timestamp period_end
    }

    %% Organizations
    organizations {
        uuid id PK
        string org_name
        uuid user_id FK "Owner"
        uuid plan_id FK
    }

    organizations_members {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        string role
    }

    invite_org_members {
        uuid invite_id PK
        uuid org_id FK
        string email
        uuid invited_by FK
    }

    %% Projects
    projects {
        uuid id PK
        uuid user_id FK
        uuid org_id FK
        string title
    }

    projects_members {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string role
    }

    projects_logs {
        uuid log_id PK
        uuid project_id FK
        uuid user_id FK
        string operation
    }

    %% Notes & Content
    notes {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        uuid org_id FK
        string title
        jsonb files
    }

    note_collaborators {
        uuid note_id PK, FK
        uuid user_id PK, FK
    }

    note_collaborators_logs {
        uuid log_id PK
        uuid note_id FK
        uuid target_user_id FK
    }

    blocks {
        uuid id PK
        uuid note_id FK
        uuid parent_id FK
        string type
        text text
    }

    blocks_logs {
        uuid log_id PK
        uuid block_id FK
        uuid note_id FK
    }

    %% AI Features
    ai_user_agent {
        uuid id PK
        uuid user_id FK
        jsonb personality
    }

    ai_chat_sessions {
        uuid id PK
        uuid user_id FK
        string title
    }

    ai_chat_messages {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        string role
        text content
    }

    ai_agent_actions {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        string action_type
    }

    %% Legacy/System AI
    aisessions {
        varchar session_id PK
        string subject
    }

    aiservermessages {
        serial id PK
        varchar session_id FK
    }

    jobs {
        varchar id PK
        uuid user_id FK
        string type
        string status
    }

    users_logs {
        uuid id PK
        uuid user_id FK
        string log_type
    }

    %% Relationships
    users ||--o{ tokens : "has"
    users ||--o{ users_logs : "logs"
    users ||--o{ jobs : "runs"
    users ||--o{ ai_user_agent : "configures"

    plans ||--o{ users : "assigned to"
    plans ||--o{ organizations : "assigned to"
    plans ||--o{ plans_usage : "tracks"
    plans_usage ||--o{ plan_usage_history : "archives"

    users ||--o{ organizations : "owns"
    organizations ||--o{ organizations_members : "has members"
    users ||--o{ organizations_members : "belongs to"
    organizations ||--o{ invite_org_members : "invites"

    users ||--o{ projects : "creates"
    organizations ||--o{ projects : "contains"
    projects ||--o{ projects_members : "has members"
    projects ||--o{ projects_logs : "logs"

    users ||--o{ notes : "creates"
    projects ||--o{ notes : "contains"
    organizations ||--o{ notes : "contains"
    notes ||--o{ blocks : "composed of"
    blocks ||--o{ blocks : "nested in"
    blocks ||--o{ blocks_logs : "logs"

    notes ||--o{ note_collaborators : "shared with"
    users ||--o{ note_collaborators : "collaborates"
    notes ||--o{ note_collaborators_logs : "logs collab"

    users ||--o{ ai_chat_sessions : "chats"
    ai_chat_sessions ||--o{ ai_chat_messages : "contains"
    ai_chat_sessions ||--o{ ai_agent_actions : "triggers"

    aisessions ||--o{ aiservermessages : "contains"
```
