import React from 'react';
import NativeRuntimeAI from '../components/NativeRuntimeAI';
import api from '../services/api';
const request=(endpoint,body,options)=>(body === undefined ? api.get(endpoint) : api.post(endpoint,body,options)).then(response=>response.data);
const config={
  "title": "Franchise portfolio review",
  "description": "Native OpenRouter advice for reviewing franchise operations. Recommendations require authorized review before changes to locations, permissions or financial records.",
  "endpoint": "/ai/franchise-portfolio-review",
  "fields": [
    {
      "key": "prompt",
      "label": "Portfolio review brief",
      "required": true,
      "examples": [
        "Illustrative franchise portfolio brief: review current source information, identify missing evidence, and recommend three practical next steps for an authorized reviewer. Explain assumptions. This example authorizes no external action.",
        "Illustrative franchise portfolio team planning brief: compare feasible options, explain dependencies, assign suggested responsibilities and timing, and list evidence needed before any operational change. Use a concise professional table and action list.",
        "Illustrative franchise portfolio detailed review: summarize the supplied facts, separate uncertainties, compare alternatives and tradeoffs, and propose measurable next steps. Do not invent source records or claim that integrations, approvals or external actions occurred."
      ]
    }
  ]
};
export default function NativeAIReadiness(){return <NativeRuntimeAI config={config} request={request}/>;}
