# Stratosonde

## Ultra-Lightweight Atmospheric Sensing Platform

Stratosonde is an open science initiative focused on developing ultra-lightweight, solar-powered radiosondes for long-duration atmospheric measurements. Our innovative platform combines cutting-edge microelectronics with energy harvesting technology to create atmospheric sensors weighing less than 15 grams that can operate autonomously for days or weeks at stratospheric altitudes.

Using inexpensive party balloons rather than costly weather balloons, Stratosonde makes high-altitude atmospheric research accessible and affordable. The system collects environmental data (pressure, temperature, humidity) and position information via onboard sensors, storing this data locally and transmitting it opportunistically through LoRaWAN networks when in range.

## Our Mission

To revolutionize atmospheric data collection by developing a new class of persistent radiosondes that can be deployed at a fraction of the cost of traditional platforms, enabling wider access to stratospheric sensing for research, education, and citizen science.

## At the Intersection of Heritage and Innovation

Our project honors the legacy of Environment Canada's "Project Stratosonde" from 1986, a pioneering atmospheric research initiative that used high-altitude balloons to study the ozone layer.

### The Original Project Stratosonde (1986)

In August 1986, Canada launched a 20,000 cubic meter helium balloon in Ainsworth, Nebraska, to study the ozone layer. A team of 10 researchers from Environment Canada's Atmospheric Environment Service in Downsview, Ontario, sent the stratosonde to an altitude of 29 km to measure concentrations of ozone and other gases. The Canadian experiment, known as Project Stratosonde, was carried out in parallel with the American satellite experiment under the SAGE II program.

Environment Minister Tom McMillan stated: *"This project demonstrates that Canada, the first country to ratify the Vienna Convention for the Protection of the Ozone Layer, is committed to full cooperation on research and is committed to taking action before irreparable damage occurs."*

The balloon carried an infrared remote sensing instrument that measured gases based on their own "fingerprint" in the atmospheric spectrum. By studying the intensity of this fingerprint, scientists could monitor variations in the concentration of various atmospheric gases with altitude. The stratosonde also measured the absorption of infrared radiation by chlorofluorocarbons (CFCs) in the lower atmosphere. It was important to improve understanding of this process because CFCs contribute to the greenhouse effect. An increase in their concentrations could lead to significant global warming over the coming decades.

**From Environment Canada's November 1986 "Stratosonde at 29 km altitude":** [Download (PDF, French)](https://github.com/stratosonde/.github/raw/main/profile/images/En1-3-1986-6-2-fra.pdf)

![Project Stratosonde 1986 - Zephyr Magazine](images/zephyr1986.png)

### Modern Stratosonde: Building on Heritage

Our work builds upon three distinct traditions:

- **Scientific Research**: Drawing from the legacy of Canada's atmospheric studies and ozone monitoring programs pioneered in the 1980s
- **Amateur Radio**: Embracing the spirit of ham radio operators who have pioneered long-distance communication and tracking systems
- **Pico-Ballooning**: Extending the boundaries of what's possible with ultra-lightweight balloon platforms that circumnavigate the globe

Where the 1986 project used massive 20,000 cubic meter helium balloons costing thousands of dollars per flight, today's Stratosonde weighs less than 15 grams and operates on inexpensive party balloons, making atmospheric research accessible to researchers, educators, and citizen scientists worldwide.


## Repositories

- [**firmware**](https://github.com/stratosonde/firmware) - Core firmware for the radiosonde device
- [**h3lite**](https://github.com/stratosonde/h3lite) - Embedded H3 geospatial indexing for automatic LoRaWAN region detection
- [**hardware**](https://docs.google.com/document/d/1UvLQhTHOeyt-fdj2o6CyQJJvrkRZcYuKuNxAXdWrK4A/edit?usp=sharing) - PCB designs, schematics, and component information
- [**tools**](https://github.com/stratosonde/tools) - Support tools and utilities
- [**docs**](https://github.com/stratosonde/docs) - Documentation and guides

## Key Features

- **Ultra-lightweight design** for use with inexpensive party balloons
- **Solar-powered** with energy harvesting for multi-day or persistent operation
- **Global region awareness** with automatic LoRaWAN frequency plan selection via H3 geospatial indexing
- **LoRaWAN communication** with terrestrial gateways and future LEO satellite connectivity
- **Onboard data logging** with opportunistic transmission
- **High-altitude operation** targeting stratospheric altitudes
- **Low-temperature resilience** for upper atmospheric conditions

## Technical Approach

Our platform combines modern microelectronics, energy harvesting techniques, and advanced communications to create sensing systems that can operate independently for extended periods in Earth's upper atmosphere. The integrated H3Lite library enables automatic LoRaWAN region detection, allowing the device to autonomously configure radio parameters as it drifts globally across different regulatory regions.

Looking forward, the system is designed to leverage emerging LEO LoRaWAN satellite networks, which will enable continuous global connectivity even over oceans and remote areas where terrestrial gateways are unavailable. This will transform the Stratosonde from an opportunistic data collector to a truly global atmospheric monitoring platform.

By drastically reducing weight and power requirements while incorporating intelligent geospatial awareness, we're enabling a new paradigm for atmospheric research that combines accessibility, persistence, and global reach.

## Resources

- [**Balloon Float Calculator**](https://stratosonde.github.io/.github/profile/float1g_visual.html) - Interactive step-by-step calculator with physics explanations, formulas, and safety indicators (based on the [UKHAS SPLAT float1g calculator](https://ukhas.org.uk/doku.php?id=projects:splat))
- [**Power Budget Calculator**](https://stratosonde.github.io/.github/profile/solar_radiosonde_power_budget.html) - Analyze power consumption, battery capacity, and energy harvesting for the solar-powered radiosonde system

## Community

Our work is inspired by and builds upon the pioneering efforts of the amateur radio and [picoballoon community](https://groups.io/g/picoballoon), whose innovations in ultra-lightweight balloon design and global tracking have pushed the boundaries of what's possible with minimal resources.

---

*"Between earth and sky, we drift in search of understanding."*
