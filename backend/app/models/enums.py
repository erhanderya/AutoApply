from enum import Enum


class JobSource(str, Enum):
    remoteok = "remoteok"
    adzuna = "adzuna"


class ApplyType(str, Enum):
    email = "email"
    platform = "platform"


class ApplicationStatus(str, Enum):
    pending = "pending"
    applied = "applied"
    reviewing = "reviewing"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"
