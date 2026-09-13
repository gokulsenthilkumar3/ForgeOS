from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import time
import openai

class BaseProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Returns a dict with:
        - content: str
        - latency: float
        - usage: dict (tokens, cost)
        """
        pass

class OpenAIProvider(BaseProvider):
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)

    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        start_time = time.time()
        
        # Default parameters
        model = kwargs.get("model", "gpt-3.5-turbo")
        temperature = kwargs.get("temperature", 0.7)
        
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature
        )
        
        latency = time.time() - start_time
        content = response.choices[0].message.content
        usage = response.usage
        
        # Simple cost calculation placeholder
        cost = (usage.prompt_tokens * 0.000001) + (usage.completion_tokens * 0.000002)
        
        return {
            "content": content,
            "latency": latency,
            "usage": {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
                "cost": cost
            }
        }

class AnthropicProvider(BaseProvider):
    # Skeleton for Anthropic
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        # Implement anthropic-sdk call here
        pass

class ProviderAdapter:
    """Factory to get the correct provider"""
    @staticmethod
    def get_provider(provider_name: str, api_key: str) -> BaseProvider:
        if provider_name.lower() == "openai":
            return OpenAIProvider(api_key)
        elif provider_name.lower() == "anthropic":
            return AnthropicProvider(api_key)
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")
