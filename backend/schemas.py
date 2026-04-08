"""
Pydantic schemas for the Alpha Agent Builder API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


TemplateId = Literal["default_agent"]
FrontendType = Literal["cli", "gradio", "react"]
ProviderId = Literal["openai", "gemini"]
RunStatus = Literal["idle", "running", "completed", "failed"]
ToolId = Literal[
    "document_context",
    "structured_output",
    "citation_notes",
    "checklist_planner",
]


class AgentConfigRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agent_name: str = Field(default="", min_length=0, max_length=80)
    description: str = Field(default="", max_length=4000)
    instructions: str = Field(default="", max_length=4000)
    template_id: TemplateId = Field(default="default_agent")
    provider_id: ProviderId
    model: str = Field(..., min_length=2, max_length=100)
    frontend_type: FrontendType
    temperature: float = Field(default=0.2, ge=0, le=2)
    extra_requirements: list[str] = Field(default_factory=list)
    enabled_tools: list[ToolId] = Field(default_factory=list)
    allow_file_uploads: bool = False
    supported_upload_types: list[str] = Field(default_factory=list)
    github_repo_url: str = ""

    @field_validator("agent_name", "description", "instructions", "model", "github_repo_url")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("extra_requirements")
    @classmethod
    def normalize_requirements(cls, values: list[str]) -> list[str]:
        return sorted({value.strip() for value in values if value.strip()})

    @field_validator("enabled_tools")
    @classmethod
    def normalize_tools(cls, values: list[ToolId]) -> list[ToolId]:
        return sorted(set(values))

    @field_validator("supported_upload_types")
    @classmethod
    def normalize_upload_types(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip().lower().lstrip(".") for value in values if value.strip()]
        return sorted(set(cleaned))

    @field_validator("template_id", mode="before")
    @classmethod
    def use_default_template_only(cls, value: object) -> str:
        return "default_agent"

    @field_validator("frontend_type", mode="before")
    @classmethod
    def migrate_frontend_type(cls, value: object) -> str:
        if value == "fastapi_api":
            return "react"
        return value if isinstance(value, str) else str(value)


class RequirementsPreviewRequest(BaseModel):
    config: AgentConfigRequest


class ProviderInfo(BaseModel):
    id: str
    label: str
    description: str
    default_model: str
    models: list[str]
    secret_names: list[str]


class ProvidersResponse(BaseModel):
    providers: list[ProviderInfo]


class RequirementsPreviewResponse(BaseModel):
    requirements: list[str]
    generated_files: list[str]


class AgentMetadata(BaseModel):
    user_id: int
    agent_id: str
    agent_name: str
    description: str
    instructions: str
    template_id: TemplateId
    provider_id: ProviderId
    model: str
    frontend_type: FrontendType
    temperature: float
    enabled_tools: list[ToolId]
    allow_file_uploads: bool
    supported_upload_types: list[str]
    github_repo_url: str = ""
    github_repo_path: str = ""
    github_commit_sha: str = ""
    agent_dir: str
    created_at: datetime
    has_secrets: bool
    requirements: list[str]
    generated_files: list[str]
    # "llm" when logic.py was produced by codegen; "template" when template logic is used.
    generation_source: Literal["llm", "template"] = "template"
    # Legacy field name: user env file is always merged into the agent `.env` at generate time.
    include_settings_api_keys: bool = True
    extra_secret_key_names: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def coerce_legacy_template_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            tid = data.get("template_id")
            if tid != "default_agent":
                data = {**data, "template_id": "default_agent"}
            if data.get("frontend_type") == "fastapi_api":
                data = {**data, "frontend_type": "react"}
            data.setdefault("include_settings_api_keys", True)
            data.setdefault("extra_secret_key_names", [])
        return data


class GenerateAgentResponse(BaseModel):
    message: str
    agent: AgentMetadata


class CheckInAgentResponse(BaseModel):
    message: str
    agent: AgentMetadata


class AgentListResponse(BaseModel):
    agents: list[AgentMetadata]


class AgentDetailResponse(BaseModel):
    agent: AgentMetadata


class AgentTreeNode(BaseModel):
    name: str
    path: str
    node_type: Literal["file", "directory"]
    children: list["AgentTreeNode"] = Field(default_factory=list)


class AgentTreeResponse(BaseModel):
    agent_id: str
    tree: AgentTreeNode


class RunAgentRequest(BaseModel):
    agent_id: str = Field(..., min_length=3)
    prompt: str = Field(default="", max_length=8000)

    @field_validator("agent_id", "prompt")
    @classmethod
    def strip_run_fields(cls, value: str) -> str:
        return value.strip()


class RunRecord(BaseModel):
    run_id: str
    agent_id: str
    status: RunStatus
    command: list[str]
    prompt: str
    started_at: datetime
    finished_at: datetime | None = None
    log_path: str


class RunAgentResponse(BaseModel):
    message: str
    run: RunRecord
    local_url: str | None = None


class AgentLogsResponse(BaseModel):
    run: RunRecord | None
    logs: str


class UploadedFileInfo(BaseModel):
    name: str
    stored_path: str
    size_bytes: int
    uploaded_at: datetime


class AgentUploadsResponse(BaseModel):
    agent_id: str
    files: list[UploadedFileInfo]


class UserProfile(BaseModel):
    id: int
    name: str
    username: str
    email: str
    created_at: str


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    username: str = Field(..., min_length=3, max_length=80)
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=6, max_length=200)


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=1, max_length=200)


class SettingsPayload(BaseModel):
    updated_at: str
    user_env_saved: bool


class AuthResponse(BaseModel):
    token: str
    user: UserProfile
    settings: SettingsPayload


class MeResponse(BaseModel):
    user: UserProfile
    settings: SettingsPayload


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    username: str = Field(..., min_length=3, max_length=80)
    email: str = Field(..., min_length=3, max_length=120)


class SettingsResponse(BaseModel):
    settings: SettingsPayload


class CheckInAgentRequest(BaseModel):
    repo_url: str = Field(..., min_length=8, max_length=2048)

    @field_validator("repo_url")
    @classmethod
    def strip_repo(cls, value: str) -> str:
        return value.strip()


class UserEnvResponse(BaseModel):
    content: str
    user_env_saved: bool


class UserEnvUpdateRequest(BaseModel):
    content: str = Field(default="", max_length=120_000)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=6, max_length=200)


class MessageResponse(BaseModel):
    message: str


class ProfileResponse(BaseModel):
    user: UserProfile


class AgentEditChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=48000)


class AgentEditChatRequest(BaseModel):
    messages: list[AgentEditChatMessage] = Field(..., min_length=1, max_length=40)
    include_static_diagnostics: bool = Field(
        default=True,
        description="Run py_compile on agent .py files and try `import logic`; attach output for the edit model.",
    )
    runtime_error: str = Field(
        default="",
        max_length=24000,
        description="Optional traceback or stderr from running the agent (Gradio, CLI, etc.).",
    )


class AgentEditChatResponse(BaseModel):
    assistant_message: str
    updated_files: list[str]
    activity_log: list[str] = Field(
        default_factory=list,
        description="Step-by-step trace of what the edit agent did this turn.",
    )
