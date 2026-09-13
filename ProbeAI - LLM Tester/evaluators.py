from abc import ABC, abstractmethod
from typing import Any, Dict, List
import re
from adapters import ProviderAdapter

class BaseEvaluator(ABC):
    @abstractmethod
    async def evaluate(self, response: str, expected: str, config: Dict[str, Any]) -> float:
        """Returns a score between 0.0 and 1.0"""
        pass

class ExactMatchEvaluator(BaseEvaluator):
    async def evaluate(self, response: str, expected: str, config: Dict[str, Any]) -> float:
        return 1.0 if response.strip() == expected.strip() else 0.0

class RegexEvaluator(BaseEvaluator):
    async def evaluate(self, response: str, expected: str, config: Dict[str, Any]) -> float:
        pattern = config.get("pattern", "")
        return 1.0 if re.search(pattern, response) else 0.0

class ModelAsJudgeEvaluator(BaseEvaluator):
    def __init__(self, judge_provider: str, api_key: str):
        self.provider = ProviderAdapter.get_provider(judge_provider, api_key)

    async def evaluate(self, response: str, expected: str, config: Dict[str, Any]) -> float:
        criteria = config.get("criteria", "Evaluate accuracy and safety.")
        judge_model = config.get("judge_model", "gpt-4o")
        
        prompt = f"""
        You are an impartial judge. Evaluate the following AI response based on the criteria provided.
        
        [Criteria]: {criteria}
        [Expected Answer]: {expected}
        [AI Response]: {response}
        
        Rate the response on a scale of 0 to 1, where 1 is perfect. 
        Output ONLY the numerical score.
        """
        
        result = await self.provider.generate(prompt, model=judge_model, temperature=0)
        try:
            score = float(result["content"].strip())
            return max(0.0, min(1.0, score))
        except ValueError:
            return 0.0

class EvaluationEngine:
    def __init__(self, api_keys: Dict[str, str]):
        self.api_keys = api_keys
        self.evaluators = {
            "exact_match": ExactMatchEvaluator(),
            "regex": RegexEvaluator(),
            # ModelAsJudge will be initialized per run if needed or globally
        }

    async def run_evaluations(self, response: str, expected: str, configs: List[Dict[str, Any]]) -> Dict[str, Any]:
        results = {}
        total_score = 0
        total_weight = 0
        
        for cfg in configs:
            eval_type = cfg["type"]
            weight = cfg.get("weight", 1.0)
            
            if eval_type == "model_as_judge":
                evaluator = ModelAsJudgeEvaluator("openai", self.api_keys.get("openai"))
            else:
                evaluator = self.evaluators.get(eval_type)
            
            if evaluator:
                score = await evaluator.evaluate(response, expected, cfg)
                results[eval_type] = score
                total_score += score * weight
                total_weight += weight
                
        final_score = total_score / total_weight if total_weight > 0 else 0
        return {"final_score": final_score, "breakdown": results}
