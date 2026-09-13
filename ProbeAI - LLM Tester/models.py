from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class TestSuite(Base):
    __tablename__ = "test_suites"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    config_yaml = Column(String)  # Original YAML definition
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    test_cases = relationship("TestCase", back_populates="suite", cascade="all, delete-orphan")
    runs = relationship("TestRun", back_populates="suite")

class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(Integer, primary_key=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"))
    external_id = Column(String) # ID from YAML
    prompt = Column(String, nullable=False)
    expected_output = Column(String)
    evaluation_config = Column(JSON) # List of evaluators and their params
    
    suite = relationship("TestSuite", back_populates="test_cases")
    results = relationship("TestResult", back_populates="test_case")

class TestRun(Base):
    __tablename__ = "test_runs"
    id = Column(Integer, primary_key=True)
    suite_id = Column(Integer, ForeignKey("test_suites.id"))
    status = Column(String, default="pending") # pending, running, completed, failed
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    total_cost = Column(Float, default=0.0)
    avg_latency = Column(Float, default=0.0)
    
    suite = relationship("TestSuite", back_populates="runs")
    results = relationship("TestResult", back_populates="run")

class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("test_runs.id"))
    case_id = Column(Integer, ForeignKey("test_cases.id"))
    raw_response = Column(String)
    score = Column(Float) # Weighted average score
    metrics = Column(JSON) # Individual evaluator scores: {"exact_match": 1.0, "llm_judge": 0.8}
    latency = Column(Float)
    cost = Column(Float)
    error_log = Column(String)
    
    run = relationship("TestRun", back_populates="results")
    test_case = relationship("TestCase", back_populates="results")
