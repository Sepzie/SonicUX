//! Parameter smoothing for anti-zipper and natural decay.
//!
//! Provides configurable attack/release curves to prevent harsh transitions.

/// Smoothed parameter with configurable attack/release.
#[derive(Debug, Clone, Copy)]
pub struct SmoothedParam {
    /// Current smoothed value
    current: f32,
    /// Target value
    target: f32,
    /// Attack coefficient (0..1, higher = faster)
    attack: f32,
    /// Release coefficient (0..1, higher = faster)
    release: f32,
}

impl SmoothedParam {
    /// Create a new smoothed parameter with sensible defaults.
    /// Defaults are biased toward slow attack/release for non-annoying feel.
    pub fn new(initial: f32) -> Self {
        Self {
            current: initial,
            target: initial,
            attack: 0.05,   // Slow attack
            release: 0.02,  // Even slower release
        }
    }

    /// Create with custom attack/release coefficients.
    pub fn with_coefficients(initial: f32, attack: f32, release: f32) -> Self {
        Self {
            current: initial,
            target: initial,
            attack: attack.clamp(0.001, 1.0),
            release: release.clamp(0.001, 1.0),
        }
    }

    /// Set the target value.
    pub fn set_target(&mut self, target: f32) {
        self.target = target;
    }

    /// Get the current smoothed value.
    pub fn value(&self) -> f32 {
        self.current
    }

    /// Get the target value.
    pub fn target(&self) -> f32 {
        self.target
    }

    /// Update the smoothed value (call once per frame).
    pub fn update(&mut self) {
        let coeff = if self.target > self.current {
            self.attack
        } else {
            self.release
        };
        self.current = lerp(self.current, self.target, coeff);
    }

    /// Check if the value has effectively reached its target.
    pub fn is_settled(&self) -> bool {
        (self.current - self.target).abs() < 0.001
    }

    /// Set attack coefficient.
    pub fn set_attack(&mut self, attack: f32) {
        self.attack = attack.clamp(0.001, 1.0);
    }

    /// Set release coefficient.
    pub fn set_release(&mut self, release: f32) {
        self.release = release.clamp(0.001, 1.0);
    }
}

impl Default for SmoothedParam {
    fn default() -> Self {
        Self::new(0.0)
    }
}

/// Smoother for all musical parameters.
#[derive(Debug, Default)]
pub struct ParamSmoother {
    pub cutoff: SmoothedParam,
    pub warmth: SmoothedParam,
    pub stereo_width: SmoothedParam,
    pub reverb: SmoothedParam,
    pub activity: SmoothedParam,
}

impl ParamSmoother {
    /// Create a new param smoother with default values.
    pub fn new() -> Self {
        Self {
            cutoff: SmoothedParam::new(0.5),
            warmth: SmoothedParam::new(0.5),
            stereo_width: SmoothedParam::new(0.3),
            reverb: SmoothedParam::new(0.4),
            activity: SmoothedParam::new(0.0),
        }
    }

    /// Update all smoothed parameters.
    pub fn update(&mut self) {
        self.cutoff.update();
        self.warmth.update();
        self.stereo_width.update();
        self.reverb.update();
        self.activity.update();
    }

    /// Apply reduced motion profile - increases smoothing times.
    pub fn apply_reduced_motion(&mut self) {
        let slow_attack = 0.02;
        let slow_release = 0.01;

        self.cutoff.set_attack(slow_attack);
        self.cutoff.set_release(slow_release);
        self.warmth.set_attack(slow_attack);
        self.warmth.set_release(slow_release);
        self.stereo_width.set_attack(slow_attack);
        self.stereo_width.set_release(slow_release);
        self.reverb.set_attack(slow_attack);
        self.reverb.set_release(slow_release);
        self.activity.set_attack(slow_attack);
        self.activity.set_release(slow_release);
    }

    /// Apply normal smoothing profile.
    pub fn apply_normal_motion(&mut self) {
        let normal_attack = 0.05;
        let normal_release = 0.02;

        self.cutoff.set_attack(normal_attack);
        self.cutoff.set_release(normal_release);
        self.warmth.set_attack(normal_attack);
        self.warmth.set_release(normal_release);
        self.stereo_width.set_attack(normal_attack);
        self.stereo_width.set_release(normal_release);
        self.reverb.set_attack(normal_attack);
        self.reverb.set_release(normal_release);
        self.activity.set_attack(normal_attack);
        self.activity.set_release(normal_release);
    }
}

/// State tracker for values that should decay when no input is received.
#[derive(Debug, Clone, Copy)]
pub struct DecayingValue {
    /// Current value
    current: f32,
    /// Decay rate per update (0..1)
    decay_rate: f32,
    /// Last known valid value (for sentinel handling)
    last_valid: f32,
}

impl DecayingValue {
    /// Create a new decaying value.
    pub fn new(initial: f32, decay_rate: f32) -> Self {
        Self {
            current: initial,
            decay_rate: decay_rate.clamp(0.0, 1.0),
            last_valid: initial,
        }
    }

    /// Update with a new value. If sentinel (-1), decay from last known.
    pub fn update(&mut self, value: f32) {
        if value < 0.0 {
            // Sentinel value: decay toward zero
            self.current = self.current * (1.0 - self.decay_rate);
        } else {
            // Valid value: update
            self.current = value;
            self.last_valid = value;
        }
    }

    /// Get current value.
    pub fn value(&self) -> f32 {
        self.current
    }

    /// Get last known valid value.
    pub fn last_valid(&self) -> f32 {
        self.last_valid
    }
}

/// Linear interpolation helper.
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_smoothed_param_convergence() {
        let mut param = SmoothedParam::new(0.0);
        param.set_target(1.0);

        for _ in 0..100 {
            param.update();
        }

        assert!(param.value() > 0.95);
    }

    #[test]
    fn test_decaying_value_sentinel() {
        let mut decay = DecayingValue::new(1.0, 0.1);

        // Valid update
        decay.update(0.8);
        assert!((decay.value() - 0.8).abs() < 0.01);

        // Sentinel update - should decay
        decay.update(-1.0);
        assert!(decay.value() < 0.8);
    }
}
