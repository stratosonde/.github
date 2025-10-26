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
  
  // STEP 4: Onset Altitude (where balloon first reaches max volume)
  let onset_altitude = 0;
  for (let h = 0; h <= 40000; h += 1) {
    const [P_h, T_h] = isaPressureTemp(h);
    const unconstrained_volume = fill_volume * (P_launch / P_h) * (T_h / T_launch_K);
    if (unconstrained_volume >= balloon_volume) {
      onset_altitude = h;
      break;
    }
  }
  
  updateElement('onset_altitude', onset_altitude.toFixed(0));
  
  // STEP 5: Float Altitude (where system density = air density)
  let float_altitude = 0, temp_float = 0, pressure_float = 0;
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
  
  updateElement('float_altitude', float_altitude.toFixed(0));
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
  if (diff_pressure < 4.0) {
    safetyEl.className = 'safety-indicator safety-safe';
    safetyEl.textContent = `✅ SAFE: ${diff_pressure.toFixed(2)} kPa is well below burst limit (4.7-5.4 kPa)`;
  } else if (diff_pressure < 4.7) {
    safetyEl.className = 'safety-indicator safety-caution';
    safetyEl.textContent = `⚠️ CAUTION: ${diff_pressure.toFixed(2)} kPa is approaching burst limit (4.7-5.4 kPa)`;
  } else {
    safetyEl.className = 'safety-indicator safety-danger';
    safetyEl.textContent = `❌ DANGER: ${diff_pressure.toFixed(2)} kPa exceeds burst limit (4.7-5.4 kPa)`;
  }
  
  // Update chart
  updatePressureChart(P_launch, fill_volume, T_launch_K, balloon_volume, float_altitude, onset_altitude);
}

// Update pressure chart
function updatePressureChart(P_launch, fill_volume, T_launch_K, balloon_volume, float_altitude, onset_altitude) {
  const altitudes = [];
  const externalPressures = [];
  const internalPressures = [];
  
  const maxAlt = Math.min(40000, float_altitude * 1.5);
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
  
  if (pressureChart) pressureChart.destroy();
  const ctx = document.getElementById('pressureChart').getContext('2d');
  
  pressureChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'External Pressure',
        data: externalPressures.map((p, i) => ({ x: p, y: altitudes[i] })),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderWidth: 2,
        showLine: true,
        pointRadius: 0
      }, {
        label: 'Internal Pressure',
        data: internalPressures.map((p, i) => ({ x: p, y: altitudes[i] })),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 2,
        showLine: true,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
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
