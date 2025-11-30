// Superpressure Balloon Calculator - Physics Engine
// Constants (ISA Atmospheric Model)
const PHYSICS = {
  g: 9.80665,        // Gravity (m/s²)
  R: 8.3144598,      // Universal gas constant (J/(mol·K))
  M: 0.0289644,      // Molar mass of air (kg/mol)
  T0: 288.15,        // Sea level standard temperature (K)
  P0: 101.325,       // Sea level standard pressure (kPa)
  L: 0.0065          // Temperature lapse rate (K/m)
};

// Global state
let pressureChart = null;
let gasMassChart = null;
let diffPressureChart = null;
let valveState = {
  isOpen: false,
  activationAltitude: null,
  gasMassReleased: 0
};
let ascentData = {
  altitudes: [],
  gasMasses: [],
  gasMassesNoValve: [],
  diffPressures: [],
  diffPressuresNoValve: []
};

// ISA atmospheric model - returns [P (kPa), T (K)] at altitude h (m)
function isaPressureTemp(h) {
  if (h <= 11000) {
    const T = PHYSICS.T0 - PHYSICS.L * h;
    const P = PHYSICS.P0 * Math.pow(1 - (PHYSICS.L * h) / PHYSICS.T0, 
                                     (PHYSICS.g * PHYSICS.M) / (PHYSICS.R * PHYSICS.L));
    return [P, T];
  } else {
    const T = 216.65;
    const P11 = PHYSICS.P0 * Math.pow(1 - (PHYSICS.L * 11000) / PHYSICS.T0, 
                                       (PHYSICS.g * PHYSICS.M) / (PHYSICS.R * PHYSICS.L));
    const P = P11 * Math.exp(-PHYSICS.g * PHYSICS.M * (h - 11000) / (PHYSICS.R * T));
    return [P, T];
  }
}

// Calculate air density from pressure and temperature
function airDensity(P, T) {
  return (P * 1000) / (287.05 * T);
}

// Simulate ascent with pressure relief valve
function simulateAscentWithValve(params) {
  const { P_launch, T_launch_K, fill_volume, balloon_volume, gas_density, 
          balloon_weight, payload_weight, valve_limit_psi } = params;
  
  // Convert psi to kPa
  const valve_limit_kPa = valve_limit_psi * 6.89476;
  
  // Reset valve state and data arrays
  valveState.activationAltitude = null;
  valveState.gasMassReleased = 0;
  ascentData.altitudes = [];
  ascentData.gasMasses = [];
  ascentData.gasMassesNoValve = [];
  ascentData.diffPressures = [];
  ascentData.diffPressuresNoValve = [];
  
  let current_gas_mass = fill_volume * gas_density * 1000; // in grams
  const initial_gas_mass = current_gas_mass;
  let onset_altitude = null;
  let float_altitude = null;
  let final_temp = T_launch_K;
  let final_pressure = P_launch;
  
  // Simulate ascent in 100m steps
  for (let h = 0; h <= 40000; h += 100) {
    const [P_h, T_h] = isaPressureTemp(h);
    const air_density_h = airDensity(P_h, T_h);
    
    // Current gas volume based on expansion
    const current_gas_volume_kg = current_gas_mass / 1000; // kg
    const unconstrained_volume = (current_gas_volume_kg / gas_density) * (P_launch / P_h) * (T_h / T_launch_K);
    
    // Check if balloon is at max volume (onset)
    const at_max_volume = unconstrained_volume >= balloon_volume;
    if (onset_altitude === null && at_max_volume) {
      onset_altitude = h;
    }
    
    // Calculate pressures
    let P_internal, delta_P, P_internal_no_valve, delta_P_no_valve;
    if (at_max_volume) {
      // WITH VALVE: Constrained by envelope - calculate internal pressure
      P_internal = (P_launch * (current_gas_mass / 1000 / gas_density) / T_launch_K) * (T_h / balloon_volume);
      delta_P = P_internal - P_h;
      
      // WITHOUT VALVE: What pressure would be without valve
      P_internal_no_valve = (P_launch * (initial_gas_mass / 1000 / gas_density) / T_launch_K) * (T_h / balloon_volume);
      delta_P_no_valve = P_internal_no_valve - P_h;
      
      // Simple valve logic - if pressure exceeds limit, vent to limit
      if (delta_P >= valve_limit_kPa) {
        if (valveState.activationAltitude === null) {
          valveState.activationAltitude = h;
        }
        
        // Target internal pressure = external + valve limit
        const P_target = P_h + valve_limit_kPa;
        // Calculate required gas mass for this pressure
        const required_gas_mass_kg = (P_target * balloon_volume * T_launch_K) / (P_launch * T_h) * gas_density;
        const new_gas_mass = required_gas_mass_kg * 1000; // grams
        
        if (new_gas_mass < current_gas_mass) {
          valveState.gasMassReleased += (current_gas_mass - new_gas_mass);
          current_gas_mass = new_gas_mass;
          // Recalculate with new gas mass
          P_internal = (P_launch * (current_gas_mass / 1000 / gas_density) / T_launch_K) * (T_h / balloon_volume);
          delta_P = P_internal - P_h;
        }
      }
    } else {
      // Free expansion phase
      P_internal = P_h;
      delta_P = 0;
      P_internal_no_valve = P_h;
      delta_P_no_valve = 0;
    }
    
    // Store data for charts
    ascentData.altitudes.push(h);
    ascentData.gasMasses.push(current_gas_mass);
    ascentData.gasMassesNoValve.push(initial_gas_mass);
    ascentData.diffPressures.push(delta_P);
    ascentData.diffPressuresNoValve.push(delta_P_no_valve);
    
    // Check for float altitude (neutral buoyancy)
    const total_mass = (balloon_weight + payload_weight + current_gas_mass) / 1000; // kg
    const effective_volume = at_max_volume ? balloon_volume : unconstrained_volume;
    const system_density = total_mass / effective_volume;
    
    if (float_altitude === null && air_density_h <= system_density) {
      float_altitude = h;
      final_temp = T_h;
      final_pressure = P_h;
      break;
    }
  }
  
  return {
    onset_altitude: onset_altitude || 0,
    float_altitude: float_altitude || 0,
    final_temp,
    final_pressure,
    final_gas_mass: current_gas_mass,
    valve_activated: valveState.activationAltitude !== null
  };
}

// Main calculation function
function updateCalculations() {
  // Get inputs
  const gas_density = parseFloat(document.getElementById('gas_type').value);
  const balloon_volume = parseFloat(document.getElementById('balloon_volume').value);
  const balloon_weight = parseFloat(document.getElementById('balloon_weight').value);
  const payload_weight = parseFloat(document.getElementById('payload_weight').value);
  const free_lift = parseFloat(document.getElementById('free_lift').value);
  const launch_elevation = parseFloat(document.getElementById('launch_elevation').value);
  const launch_temp_c = parseFloat(document.getElementById('launch_temp').value);
  
  // STEP 2 & 3: Launch Conditions (calculate first to get fill volume)
  const T_launch_K = launch_temp_c + 273.15;  // Use ACTUAL input temperature
  let P_launch;
  
  if (launch_elevation <= 11000) {
    P_launch = PHYSICS.P0 * Math.pow(1 - (PHYSICS.L * launch_elevation) / PHYSICS.T0, 
                                      (PHYSICS.g * PHYSICS.M) / (PHYSICS.R * PHYSICS.L));
  } else {
    const P11 = PHYSICS.P0 * Math.pow(1 - (PHYSICS.L * 11000) / PHYSICS.T0, 
                                       (PHYSICS.g * PHYSICS.M) / (PHYSICS.R * PHYSICS.L));
    P_launch = P11 * Math.exp(-PHYSICS.g * PHYSICS.M * (launch_elevation - 11000) / (PHYSICS.R * 216.65));
  }
  
  const air_density_launch = airDensity(P_launch, T_launch_K);  // Use actual temp, not ISA!
  const neck_lift = free_lift + payload_weight;  // Neck lift displayed = free lift + payload only
  // But fill volume calculation includes balloon weight per Excel: =(D6+F6+G6)/((P7-C6)*1000)
  const fill_volume = (free_lift + payload_weight + balloon_weight) / ((air_density_launch - gas_density) * 1000);
  const fill_ratio = (fill_volume / balloon_volume) * 100;
  
  // NOW calculate gas mass based on FILL volume (actual amount of gas put in)
  const gas_mass = fill_volume * gas_density * 1000;
  const total_mass = balloon_weight + payload_weight + gas_mass;
  const system_density = total_mass / balloon_volume / 1000;
  
  updateElement('gas_mass', gas_mass.toFixed(2));
  updateElement('total_mass', total_mass.toFixed(2));
  updateElement('system_density', system_density.toFixed(4));
  updateElement('calc_gas_mass', `= ${fill_volume.toFixed(4)} × ${gas_density} × 1000 = ${gas_mass.toFixed(2)} g`);
  updateElement('calc_total_mass', `= ${balloon_weight} + ${payload_weight} + ${gas_mass.toFixed(2)} = ${total_mass.toFixed(2)} g`);
  updateElement('calc_system_density', `= ${total_mass.toFixed(2)} / ${balloon_volume} / 1000 = ${system_density.toFixed(4)} kg/m³`);
  
  updateElement('neck_lift', neck_lift.toFixed(2));
  updateElement('fill_volume', fill_volume.toFixed(4));
  updateElement('fill_ratio', fill_ratio.toFixed(1));
  updateElement('fill_volume_liters', (fill_volume * 1000).toFixed(0));
  updateElement('calc_launch_pressure', `At ${launch_elevation}m elevation = ${P_launch.toFixed(3)} kPa`);
  updateElement('calc_air_density', `= ${air_density_launch.toFixed(4)} kg/m³`);
  updateElement('calc_neck_lift', `= ${free_lift} + ${payload_weight} = ${neck_lift.toFixed(2)} g`);
  updateElement('calc_fill_volume', `= (${free_lift} + ${payload_weight} + ${balloon_weight}) / ((${air_density_launch.toFixed(4)} - ${gas_density}) × 1000) = ${fill_volume.toFixed(4)} m³`);
  
  // STEP 3: Calculate forces and ascent rate at launch
  const total_mass_kg = total_mass / 1000;
  const V_launch = fill_volume;
  const F_buoyancy_launch = air_density_launch * V_launch * PHYSICS.g;
  const F_weight = total_mass_kg * PHYSICS.g;
  const F_net_launch = F_buoyancy_launch - F_weight;
  
  // Calculate ascent rate with drag
  const radius = Math.pow(3 * V_launch / (4 * Math.PI), 1/3);
  const A_cross = Math.PI * radius * radius;
  const Cd = 0.5; // Drag coefficient for sphere
  const v_ascent_launch = (F_net_launch > 0 && air_density_launch > 0) ? 
    Math.sqrt(2 * F_net_launch / (Cd * air_density_launch * A_cross)) : 0;
  
  updateElement('calc_buoyancy', `F_b = ${air_density_launch.toFixed(4)} × ${V_launch.toFixed(3)} × 9.81 = ${F_buoyancy_launch.toFixed(3)} N`);
  updateElement('calc_weight', `F_w = ${total_mass_kg.toFixed(4)} × 9.81 = ${F_weight.toFixed(3)} N`);
  updateElement('calc_net_force', `F_net = ${F_buoyancy_launch.toFixed(3)} - ${F_weight.toFixed(3)} = ${F_net_launch.toFixed(3)} N`);
  updateElement('calc_ascent_rate', `v = ${v_ascent_launch.toFixed(2)} m/s (${(v_ascent_launch * 196.85).toFixed(0)} ft/min)`);
  
  updateElement('ascent_rate_ms', v_ascent_launch.toFixed(2));
  updateElement('ascent_rate_fpm', (v_ascent_launch * 196.85).toFixed(0));
  updateElement('net_force', F_net_launch.toFixed(3));
  
  // Update summary cards (will be populated after float/onset calculations)
  
  // Check if pressure relief valve is enabled
  const valve_enabled = document.getElementById('valve_enabled')?.checked || false;
  const valve_limit_psi = parseFloat(document.getElementById('valve_pressure_limit')?.value || 0.6);
  
  let onset_altitude, float_altitude, temp_float, pressure_float;
  let final_gas_mass = gas_mass;
  let valve_info = '';
  
  if (valve_enabled) {
    // Run valve simulation
    const valveResults = simulateAscentWithValve({
      P_launch,
      T_launch_K,
      fill_volume,
      balloon_volume,
      gas_density,
      balloon_weight,
      payload_weight,
      valve_limit_psi
    });
    
    onset_altitude = valveResults.onset_altitude;
    float_altitude = valveResults.float_altitude;
    temp_float = valveResults.final_temp;
    pressure_float = valveResults.final_pressure;
    final_gas_mass = valveResults.final_gas_mass;
    
    if (valveResults.valve_activated) {
      valve_info = ` (Valve opened at ${valveState.activationAltitude}m, released ${valveState.gasMassReleased.toFixed(1)}g)`;
    }
  } else {
    // Original calculation without valve
    // STEP 4: Onset Altitude (where balloon first reaches max volume)
    onset_altitude = 0;
    for (let h = 0; h <= 40000; h += 1) {
      const [P_h, T_h] = isaPressureTemp(h);
      const unconstrained_volume = fill_volume * (P_launch / P_h) * (T_h / T_launch_K);
      if (unconstrained_volume >= balloon_volume) {
        onset_altitude = h;
        break;
      }
    }
    
    // STEP 5: Float Altitude (where system density = air density)
    float_altitude = 0;
    temp_float = 0;
    pressure_float = 0;
    for (let h = 0; h <= 40000; h += 1) {
      const [P_h, T_h] = isaPressureTemp(h);
      const air_density_h = airDensity(P_h, T_h);
      if (air_density_h <= system_density) {
        float_altitude = h;
        temp_float = T_h;
        pressure_float = P_h;
        break;
      }
    }
  }
  
  updateElement('onset_altitude', onset_altitude.toFixed(0));
  updateElement('onset_altitude_ft', (onset_altitude * 3.28084).toFixed(0));
  
  updateElement('float_altitude', float_altitude.toFixed(0));
  updateElement('float_altitude_ft', (float_altitude * 3.28084).toFixed(0));
  updateElement('temp_float', (temp_float - 273.15).toFixed(1));
  updateElement('pressure_float', pressure_float.toFixed(3));
  updateElement('altitude_gain', (float_altitude - onset_altitude).toFixed(0));
  updateElement('calc_float_search', `Onset at ${onset_altitude}m, Float at ${float_altitude}m`);
  
  // STEP 6: Pressure Analysis
  // Internal pressure formula matching Excel: (P_launch * fill_volume / T_launch_K) * (temp_float / balloon_volume)
  const internal_pressure = (P_launch * fill_volume / T_launch_K) * (temp_float / balloon_volume);
  const diff_pressure = internal_pressure - pressure_float;
  const diff_pressure_psi = diff_pressure * 0.145038;
  
  updateElement('internal_pressure', internal_pressure.toFixed(3));
  updateElement('diff_pressure', diff_pressure.toFixed(3));
  updateElement('diff_pressure_psi', diff_pressure_psi.toFixed(3));
  updateElement('calc_internal_pressure', `= (${P_launch.toFixed(3)} × ${fill_volume.toFixed(4)} / ${T_launch_K.toFixed(2)}) × (${temp_float.toFixed(2)} / ${balloon_volume}) = ${internal_pressure.toFixed(3)} kPa`);
  updateElement('calc_diff_pressure', `= ${internal_pressure.toFixed(3)} - ${pressure_float.toFixed(3)} = ${diff_pressure.toFixed(3)} kPa (${diff_pressure_psi.toFixed(3)} psi)`);
  
  // Safety indicator
  const safetyEl = document.getElementById('safety_indicator');
  let safetyText = '';
  
  if (valve_enabled && valveState.activationAltitude) {
    // Valve activated case
    safetyEl.className = 'safety-indicator safety-safe';
    safetyText = `🔓 VALVE ACTIVE: Opened at ${valveState.activationAltitude}m, released ${valveState.gasMassReleased.toFixed(1)}g gas. `;
    safetyText += `Pressure limited to ${valve_limit_psi.toFixed(2)} psi (${(valve_limit_psi * 6.89476).toFixed(2)} kPa)`;
  } else if (valve_enabled) {
    // Valve enabled but not activated
    safetyText = `🔒 VALVE READY: Max pressure ${diff_pressure.toFixed(2)} kPa below valve threshold. `;
    if (diff_pressure < 4.0) {
      safetyEl.className = 'safety-indicator safety-safe';
      safetyText += `✅ SAFE Configuration`;
    } else if (diff_pressure < 4.7) {
      safetyEl.className = 'safety-indicator safety-caution';
      safetyText += `⚠️ Approaching burst limit`;
    } else {
      safetyEl.className = 'safety-indicator safety-danger';
      safetyText += `❌ Would exceed burst limit without valve`;
    }
  } else {
    // No valve - original safety check
    if (diff_pressure < 4.0) {
      safetyEl.className = 'safety-indicator safety-safe';
      safetyText = `✅ SAFE: ${diff_pressure.toFixed(2)} kPa is well below burst limit (4.7-5.4 kPa)`;
    } else if (diff_pressure < 4.7) {
      safetyEl.className = 'safety-indicator safety-caution';
      safetyText = `⚠️ CAUTION: ${diff_pressure.toFixed(2)} kPa is approaching burst limit (4.7-5.4 kPa)`;
    } else {
      safetyEl.className = 'safety-indicator safety-danger';
      safetyText = `❌ DANGER: ${diff_pressure.toFixed(2)} kPa exceeds burst limit (4.7-5.4 kPa)`;
    }
  }
  
  safetyEl.textContent = safetyText;
  
  // Update Results Summary at top
  updateElement('summary_float_m', float_altitude.toFixed(0));
  updateElement('summary_float_ft', (float_altitude * 3.28084).toFixed(0));
  updateElement('summary_onset_m', onset_altitude.toFixed(0));
  updateElement('summary_onset_ft', (onset_altitude * 3.28084).toFixed(0));
  updateElement('summary_ascent_ms', v_ascent_launch.toFixed(2));
  updateElement('summary_ascent_fpm', (v_ascent_launch * 196.85).toFixed(0));
  updateElement('summary_fill', (fill_volume * 1000).toFixed(0));
  updateElement('summary_fill_ratio', fill_ratio.toFixed(1));
  updateElement('summary_diff_psi', diff_pressure_psi.toFixed(2));
  
  // Update safety status color and text
  const summaryCard = document.getElementById('summary_safety_card');
  if (diff_pressure < 4.0) {
    summaryCard.style.background = 'linear-gradient(135deg,#81c784 0%,#66bb6a 100%)';
    updateElement('summary_safety_status', '✅ SAFE');
  } else if (diff_pressure < 4.7) {
    summaryCard.style.background = 'linear-gradient(135deg,#ffb74d 0%,#ffa726 100%)';
    updateElement('summary_safety_status', '⚠️ CAUTION');
  } else {
    summaryCard.style.background = 'linear-gradient(135deg,#e57373 0%,#ef5350 100%)';
    updateElement('summary_safety_status', '❌ DANGER');
  }
  
  // Update valve summary card
  const valveSummaryCard = document.getElementById('summary_valve_card');
  if (valve_enabled && valveState.activationAltitude) {
    valveSummaryCard.style.display = 'block';
    updateElement('summary_valve_info', `Released ${valveState.gasMassReleased.toFixed(1)}g at ${valveState.activationAltitude}m`);
  } else {
    valveSummaryCard.style.display = 'none';
  }
  
  // Update valve results panel and charts
  const valveResultsEl = document.getElementById('valve_results');
  const gasMassChartContainer = document.getElementById('gasMassChartContainer');
  const diffPressureChartContainer = document.getElementById('diffPressureChartContainer');
  const valveChartNote = document.getElementById('valve_chart_note');
  
  if (valve_enabled && valveState.activationAltitude) {
    // Calculate altitude loss for comparison
    let no_valve_float = 0;
    const no_valve_density = (balloon_weight + payload_weight + gas_mass) / balloon_volume / 1000;
    for (let h = 0; h <= 40000; h += 1) {
      const [P_h, T_h] = isaPressureTemp(h);
      const air_density_h = airDensity(P_h, T_h);
      if (air_density_h <= no_valve_density) {
        no_valve_float = h;
        break;
      }
    }
    const altitude_loss = no_valve_float - float_altitude;
    
    // Show and populate valve results
    valveResultsEl.style.display = 'block';
    updateElement('valve_activation_alt', valveState.activationAltitude);
    updateElement('valve_gas_released', valveState.gasMassReleased.toFixed(1));
    updateElement('valve_altitude_loss', altitude_loss.toFixed(0));
    updateElement('valve_final_float', float_altitude.toFixed(0));
    
    // Show additional charts
    gasMassChartContainer.style.display = 'block';
    diffPressureChartContainer.style.display = 'block';
    valveChartNote.style.display = 'inline';
    
    // Update all charts with valve data
    updatePressureChart(P_launch, fill_volume, T_launch_K, balloon_volume, float_altitude, onset_altitude, valve_limit_psi);
    updateGasMassChart();
    updateDiffPressureChart(valve_limit_psi);
  } else {
    valveResultsEl.style.display = 'none';
    gasMassChartContainer.style.display = 'none';
    diffPressureChartContainer.style.display = 'none';
    valveChartNote.style.display = 'none';
    
    // Update standard pressure chart
    updatePressureChart(P_launch, fill_volume, T_launch_K, balloon_volume, float_altitude, onset_altitude);
  }
}

// Update pressure chart
function updatePressureChart(P_launch, fill_volume, T_launch_K, balloon_volume, float_altitude, onset_altitude, valve_limit_psi) {
  const altitudes = [];
  const externalPressures = [];
  const internalPressures = [];
  
  const maxAlt = Math.min(40000, float_altitude * 1.5);
  
  // Determine if we should use valve data
  const useValveData = valve_limit_psi !== undefined && ascentData.altitudes.length > 0;
  
  if (useValveData) {
    // Use pre-calculated valve simulation data
    for (let i = 0; i < ascentData.altitudes.length; i++) {
      const h = ascentData.altitudes[i];
      if (h > maxAlt) break;
      
      const [P_h, T_h] = isaPressureTemp(h);
      altitudes.push(h);
      externalPressures.push(P_h);
      
      // Internal pressure = external + differential
      const P_int = P_h + ascentData.diffPressures[i];
      internalPressures.push(P_int);
    }
  } else {
    // Standard calculation without valve
    for (let h = 0; h <= maxAlt; h += 100) {
      const [P_h, T_h] = isaPressureTemp(h);
      const unconstrained_volume = fill_volume * (P_launch / P_h) * (T_h / T_launch_K);
      
      altitudes.push(h);
      externalPressures.push(P_h);
      
      let p_int;
      if (unconstrained_volume >= balloon_volume) {
        p_int = (P_launch * fill_volume / T_launch_K) * (T_h / balloon_volume);
      } else {
        p_int = P_h;
      }
      internalPressures.push(p_int);
    }
  }
  
  if (pressureChart) pressureChart.destroy();
  const ctx = document.getElementById('pressureChart').getContext('2d');
  
  const datasets = [{
    label: 'External Pressure',
    data: externalPressures.map((p, i) => ({ x: p, y: altitudes[i] })),
    borderColor: 'rgba(54, 162, 235, 1)',
    backgroundColor: 'rgba(54, 162, 235, 0.5)',
    borderWidth: 2,
    showLine: true,
    pointRadius: 0
  }, {
    label: useValveData ? 'Internal Pressure (with valve)' : 'Internal Pressure',
    data: internalPressures.map((p, i) => ({ x: p, y: altitudes[i] })),
    borderColor: useValveData ? 'rgba(76, 175, 80, 1)' : 'rgba(255, 99, 132, 1)',
    backgroundColor: useValveData ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 99, 132, 0.5)',
    borderWidth: 3,
    showLine: true,
    pointRadius: 0
  }];
  
  // Add no-valve comparison if valve is active
  if (useValveData && ascentData.diffPressuresNoValve.length > 0) {
    const internalPressuresNoValve = [];
    for (let i = 0; i < ascentData.altitudes.length; i++) {
      const [P_h, ] = isaPressureTemp(ascentData.altitudes[i]);
      internalPressuresNoValve.push(P_h + ascentData.diffPressuresNoValve[i]);
    }
    
    datasets.push({
      label: 'Internal Pressure (without valve)',
      data: internalPressuresNoValve.map((p, i) => ({ x: p, y: altitudes[i] })),
      borderColor: 'rgba(255, 99, 132, 0.5)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderWidth: 2,
      borderDash: [5, 5],
      showLine: true,
      pointRadius: 0
    });
  }
  
  pressureChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          title: { display: true, text: 'Pressure (kPa)' },
          beginAtZero: true,
          reverse: true
        },
        y: { 
          title: { display: true, text: 'Altitude (m)' },
          beginAtZero: true
        }
      },
      plugins: {
        title: { display: true, text: 'Pressure vs Altitude - Color Zones Show Balloon Behavior' },
        legend: {
          display: true,
          position: 'top'
        }
      }
    },
    plugins: [{
      id: 'colorZones',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const yAxis = chart.scales.y;
        
        // Zone 1: Below onset (green) - Balloon expanding freely
        ctx.save();
        ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
        const onsetY = yAxis.getPixelForValue(onset_altitude);
        ctx.fillRect(chartArea.left, onsetY, chartArea.right - chartArea.left, chartArea.bottom - onsetY);
        
        // Zone 2: Onset to Float (yellow) - Superpressure building, slow ascent
        ctx.fillStyle = 'rgba(255, 193, 7, 0.15)';
        const floatY = yAxis.getPixelForValue(float_altitude);
        ctx.fillRect(chartArea.left, floatY, chartArea.right - chartArea.left, onsetY - floatY);
        
        // Float altitude line (dashed blue line)
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, floatY);
        ctx.lineTo(chartArea.right, floatY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add zone labels
        ctx.font = 'bold 12px Arial';
        
        // Green zone label
        ctx.fillStyle = '#2E7D32';
        const greenZoneY = onsetY + (chartArea.bottom - onsetY) / 2;
        ctx.fillText('Free Expansion', chartArea.left + 10, greenZoneY);
        ctx.font = '10px Arial';
        ctx.fillText('(Balloon inflating)', chartArea.left + 10, greenZoneY + 15);
        
        // Yellow zone label
        const yellowZoneHeight = onsetY - floatY;
        if (yellowZoneHeight > 15) {
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#F57C00';
          const yellowLabelY = onsetY - yellowZoneHeight / 2;
          ctx.fillText('Superpressure Zone', chartArea.left + 10, yellowLabelY);
          ctx.font = '10px Arial';
          ctx.fillText('(Ascent slowing)', chartArea.left + 10, yellowLabelY + 15);
        }
        
        // Float altitude label on the line
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#1976D2';
        ctx.fillText(`← Float Altitude (${float_altitude}m)`, chartArea.right - 150, floatY - 5);
        
        ctx.restore();
      }
    }]
  });
}

// Update gas mass chart
function updateGasMassChart() {
  if (gasMassChart) gasMassChart.destroy();
  const ctx = document.getElementById('gasMassChart').getContext('2d');
  
  gasMassChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ascentData.altitudes,
      datasets: [{
        label: 'Gas Mass (with valve)',
        data: ascentData.gasMasses,
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderWidth: 3,
        pointRadius: 0,
        fill: false
      }, {
        label: 'Gas Mass (without valve)',
        data: ascentData.gasMassesNoValve,
        borderColor: 'rgba(158, 158, 158, 0.7)',
        backgroundColor: 'rgba(158, 158, 158, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Altitude (m)' }
        },
        y: {
          title: { display: true, text: 'Gas Mass (g)' },
          beginAtZero: false
        }
      },
      plugins: {
        legend: { display: true, position: 'top' },
        annotation: {
          annotations: valveState.activationAltitude ? {
            valveLine: {
              type: 'line',
              xMin: valveState.activationAltitude,
              xMax: valveState.activationAltitude,
              borderColor: '#4CAF50',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: 'Valve Opens',
                enabled: true,
                position: 'start'
              }
            }
          } : {}
        }
      }
    }
  });
}

// Update differential pressure chart
function updateDiffPressureChart(valve_limit_psi) {
  if (diffPressureChart) diffPressureChart.destroy();
  const ctx = document.getElementById('diffPressureChart').getContext('2d');
  
  const valve_limit_kPa = valve_limit_psi * 6.89476;
  
  diffPressureChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ascentData.altitudes,
      datasets: [{
        label: 'ΔP (with valve)',
        data: ascentData.diffPressures,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 3,
        pointRadius: 0,
        fill: true
      }, {
        label: 'ΔP (without valve)',
        data: ascentData.diffPressuresNoValve,
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Altitude (m)' }
        },
        y: {
          title: { display: true, text: 'Differential Pressure (kPa)' },
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: true, position: 'top' },
        annotation: {
          annotations: {
            valveThreshold: {
              type: 'line',
              yMin: valve_limit_kPa,
              yMax: valve_limit_kPa,
              borderColor: '#FF9800',
              borderWidth: 2,
              borderDash: [10, 5],
              label: {
                content: `Valve Limit: ${valve_limit_psi.toFixed(2)} psi`,
                enabled: true,
                position: 'end'
              }
            }
          }
        }
      }
    }
  });
}

// Helper to update element text content
function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Initialize calculator when page loads
function initCalculator() {
  // Add event listeners to all inputs
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', updateCalculations);
  });
  
  // Initial calculation
  updateCalculations();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}
