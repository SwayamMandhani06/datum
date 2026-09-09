import io
import os
import pytest
import pytest_asyncio
from fpdf import FPDF
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import (
    init_db,
    QDRANT_URL,
    QDRANT_API_KEY,
    GROQ_API_KEY,
)
from app.embeddings import init_embedding_model
from app.vectorstore import init_vectorstore, delete_document_vectors


class SyntheticSpecPDF(FPDF):
    """Custom FPDF class that outputs a running header at the top of every page."""

    def __init__(self, running_header: str = "Datum Test Specification", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.running_header_text = running_header

    def header(self):
        self.set_font("helvetica", "B", 10)
        self.cell(0, 10, self.running_header_text, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)


def generate_synthetic_pdf(
    running_header: str = "Datum Test Specification",
    sections: list[tuple[str, str]] = None,
) -> bytes:
    """
    Generate a deterministic, self-contained multi-page synthetic PDF in memory using fpdf2.
    Each section is placed on its own page with the running header repeated across all pages.
    """
    if sections is None:
        sections = [
            (
                "4.1 TestSensorComponent Overview",
                "The TestSensorComponent is a core sensor abstraction component designed for automotive "
                "high-level design testing. It exposes a specialized client-server port called pp_TestSignal "
                "to broadcast digitized sensor readings across the vehicle network. The sensor interface "
                "operates with an execution periodicity of ten milliseconds and guarantees deterministic data "
                "delivery without signal degradation. Internal calibration tables are maintained within the "
                "non-volatile memory block for diagnostic validation and parameter adjustments.",
            ),
            (
                "4.2 TestActuatorComponent Overview",
                "The TestActuatorComponent controls physical motor actuators within the vehicle chassis "
                "subsystem. It receives target positioning commands through an input port called pp_ActuatorCommand "
                "and drives pulse-width modulation output channels accordingly. Fault containment mechanisms "
                "monitor overcurrent and overtemperature states to prevent thermal runaway. Status flags and "
                "operating modes are periodically reported back to the central supervisory unit.",
            ),
            (
                "5.1 Diagnostic Notes",
                "General diagnostic routines and logging procedures for integration testing. All communication "
                "errors are recorded into temporary circular ring buffers for post-mortem analysis. Standard test "
                "harnesses must inspect DTC status bytes prior to clearing any diagnostic events during automated "
                "validation cycles.",
            ),
        ]

    pdf = SyntheticSpecPDF(running_header=running_header)
    pdf.set_auto_page_break(auto=True, margin=15)

    for heading, body in sections:
        pdf.add_page()
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, heading, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 11)
        pdf.multi_cell(0, 6, body)

    buf = io.BytesIO(pdf.output())
    return buf.getvalue()


@pytest.fixture(scope="session")
def synthetic_pdf_bytes() -> bytes:
    """Fixture providing the primary synthetic test PDF bytes."""
    return generate_synthetic_pdf(
        running_header="Datum Test Specification",
    )


@pytest.fixture(scope="session")
def secondary_pdf_bytes() -> bytes:
    """
    Fixture providing a secondary synthetic PDF with completely distinct component/port content
    for document-isolation testing.
    """
    secondary_sections = [
        (
            "4.1 TestBatteryComponent Overview",
            "The TestBatteryComponent manages the high-voltage battery pack subsystem in electric vehicle architectures. "
            "It exposes a sender-receiver data port called pp_BatteryVoltage providing real-time cell voltage telemetry "
            "to the energy management controller. Overvoltage protection thresholds are dynamically updated based on "
            "state-of-charge calculations. Thermal runaway mitigation routines disconnect the main contactor within "
            "fifty milliseconds of critical event detection.",
        ),
        (
            "4.2 TestInverterComponent Overview",
            "The TestInverterComponent converts direct current energy from the battery pack to three-phase alternating "
            "current for the traction motor. It receives rotational torque setpoints through an input interface called "
            "pp_TorqueDemand and executes field-oriented current control algorithms.",
        ),
        (
            "5.1 High Voltage Isolation Notes",
            "Procedures for measuring isolation resistance across high-voltage bus lines during pre-flight diagnostics. "
            "Insulation monitoring devices continuously check leakage resistance and report fault states to the vehicle gateway.",
        ),
    ]
    return generate_synthetic_pdf(
        running_header="Datum Battery Specification",
        sections=secondary_sections,
    )


@pytest.fixture
def require_qdrant():
    """Skip test if QDRANT_URL is not configured."""
    if not QDRANT_URL:
        pytest.skip("QDRANT_URL is not configured in the environment. Skipping Qdrant-dependent test.")


@pytest.fixture
def require_groq():
    """Skip test if GROQ_API_KEY is not configured."""
    if not GROQ_API_KEY:
        pytest.skip("GROQ_API_KEY is not configured in the environment. Skipping Groq-dependent test.")


@pytest_asyncio.fixture
async def client():
    """
    AsyncClient fixture configured with ASGITransport targeting the FastAPI application.
    Initializes database and models, and cleans up after tests.
    """
    await init_db()
    init_embedding_model()
    init_vectorstore()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
