This is a Next.js implementation of a UI Theme Assistant.

The goal is to evaluate whether LLMs can effectively generate design tokens for UI components within accessibility and brand constraints 

Core Application logic, including token generation and evaluation, is isolated in the logic directory to separate domain logic from presentation concerns.

Constraint Input Validation is done with Zod and AJV is used when validating the tokens. AJV needed to be added cos there's a need for fast validation of LLM output