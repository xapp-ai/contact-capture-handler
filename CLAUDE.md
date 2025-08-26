# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Contact Capture Handler for the Stentor conversational AI framework. It's a TypeScript library that captures contact information and leads through conversational interfaces, supporting multiple channels and response strategies.

## Key Commands

### Development
- `yarn install` or `yarn --frozen-lockfile` - Install dependencies
- `yarn build` - Compile TypeScript to JavaScript (outputs to lib/)
- `yarn clean` - Remove compiled files from lib/
- `yarn lint` - Run ESLint on all TypeScript files
- `yarn test` - Run unit tests (.test.ts files) using Mocha
- `yarn ftest` - Run functional tests (.ftest.ts files)

### Testing
- Run single test file: `yarn test --grep "test-pattern"`
- Tests use Mocha with ts-node, Chai for assertions, and Sinon for mocking

## Architecture

### Core Components

1. **Handler** (`src/handler.ts`)
   - `ContactCaptureHandler` extends `QuestionAnsweringHandler` 
   - Main entry point for processing contact capture requests
   - Manages lead collection flow and CRM integration

2. **Response Strategies** (`src/strategies/`)
   - **ResponseStrategySelector**: Chooses strategy based on channel and configuration
     - `FormResponseStrategy`: For form-widget channel
     - `GenerativeResponseStrategy`: Uses AI when `responses="GENERATIVE_AI"` and `captureLead=true`
     - `ProgrammaticResponseStrategy`: Default strategy for structured responses

3. **Data Types** (`src/data.ts`)
   - Contact data types: FIRST_NAME, LAST_NAME, FULL_NAME, PHONE, ZIP, ADDRESS, EMAIL, SELECTION, COMPANY, ORGANIZATION, MESSAGE, DATE_TIME
   - `ContactCaptureData` interface extends QuestionAnsweringData

4. **Services** (`src/services/`)
   - `PlacesService`: Google Places API integration for address autocomplete
   - `GenerativeAIService`: AI-powered response generation

5. **Constants** (`src/constants.ts`)
   - Session variable prefixes: `ContactCapture*`
   - Content tags for different capture states
   - Default response templates

## Key Configurations

### Environment Variables
- `PLACES_API_KEY` - Google Places API key for address services
- `DISABLE_DEFAULT_RESPONSES` - Disable default responses (throws error for unknown content keys)
- `NPM_AUTH_TOKEN` - Required for package installation (in CI)

### Handler Data Properties
- `captureLead` - Enable/disable lead capture (default: false)
- `enablePreferredTime` - Allow preferred appointment time collection
- `enableFormScheduling` - Enable scheduling in form widget channel
- `responses` - Set to "GENERATIVE_AI" for AI-powered responses

## Dependencies

The project uses the Stentor framework ecosystem:
- stentor-models, stentor-context, stentor-handler, stentor-logger
- stentor-request, stentor-response, stentor-utils, stentor-guards
- @xapp/question-answering-handler for QA capabilities

## CI/CD

GitHub Actions workflows:
- **ci.yml**: Runs on non-main branches - lint, test, build on Node 18.x and 20.x
- **publish.yml**: Handles semantic release and npm publishing
- **codeql.yml**: Security analysis

Uses semantic-release for automated versioning and changelog generation.