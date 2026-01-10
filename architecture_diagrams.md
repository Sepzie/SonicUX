```graph TB
    subgraph "Browser Environment"
        subgraph "Interaction Layer"
            UI[User Actions<br/>scroll, hover, click, mouse]
            Sampler[Interaction Sampler<br/>JS]
            Frame[InteractionFrame<br/>velocity, position,<br/>gesture type, timing]
        end
        
        subgraph "Musical Intelligence Layer"
            WASM[Rust WASM Module<br/>musicalization-engine]
            HarmonyState[Harmonic State<br/>key, mode, tension]
            Smoother[Parameter Smoothing<br/>anti-zipper, momentum]
            EventGen[Event Generator<br/>plucks, cadences, accents]
        end
        
        subgraph "Audio Synthesis Layer"
            JS[JavaScript Audio Controller]
            Synth[Web Audio API<br/>Tone.js or similar]
            Effects[Effects Chain<br/>reverb, filter, stereo]
            Output[Audio Output]
        end
        
        UI --> Sampler
        Sampler --> Frame
        Frame -->|update_interaction| WASM
        
        WASM --> HarmonyState
        WASM --> Smoother
        WASM --> EventGen
        
        HarmonyState -->|OutputFrame| JS
        Smoother -->|smoothed params| JS
        EventGen -->|note events| JS
        
        JS -->|set parameters| Synth
        JS -->|trigger notes| Synth
        Synth --> Effects
        Effects --> Output
    end
    
    subgraph "Open Source Package"
        Crate[musicalization-engine<br/>Rust crate]
        NPM[npm package<br/>WASM bindings]
        
        Crate -.->|compiles to| WASM
        Crate -.->|publishes| NPM
    end
    
    style WASM fill:#f4a261,stroke:#e76f51,stroke-width:3px
    style Crate fill:#2a9d8f,stroke:#264653,stroke-width:2px
    style Output fill:#e9c46a,stroke:#f4a261,stroke-width:2px
```

```sequenceDiagram
    participant User
    participant DOM
    participant Sampler
    participant WASM as Rust Engine (WASM)
    participant Audio as JS Audio Layer
    participant Synth as Web Audio / Tone.js
    
    User->>DOM: Scroll page
    DOM->>Sampler: scroll event (velocity, position)
    
    User->>DOM: Move mouse
    DOM->>Sampler: mousemove event (x, y, speed)
    
    Note over Sampler: Converts raw events to<br/>normalized InteractionFrame
    
    Sampler->>WASM: update_interaction(frame)
    
    Note over WASM: Musical logic:<br/>• Smooth parameters<br/>• Update harmonic tension<br/>• Generate chord changes<br/>• Detect accent moments
    
    WASM->>Audio: OutputFrame {<br/>  params: {cutoff, warmth, width},<br/>  harmony: {key: "C", mode: "dorian"},<br/>  events: [{type: "pluck", vel: 0.3}]<br/>}
    
    Audio->>Synth: Set filter cutoff (smoothed)
    Audio->>Synth: Set reverb send (smoothed)
    Audio->>Synth: Trigger note (C4, velocity 0.3)
    
    Synth->>User: 🔊 Gentle ambient response
```
