const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  commonName: {
    type: String,
    required: true,
    index: true
  },
  scientificName: {
    type: String,
    required: true,
    unique: true
  },
  family: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  wikiDescription: {
    type: String
  },
  habitat: {
    type: String,
    required: true
  },
  uses: [{
    type: String
  }],
  images: [{
    url: String,
    caption: String
  }],
  wikiImage: {
    type: String
  },
  taxonomy: {
    kingdom: String,
    phylum: String,
    class: String,
    order: String,
    family: String,
    genus: String,
    species: String,
    subspecies: String,
    variety: String,
    form: String
  },
  synonyms: [{
    type: String
  }],
  // Enhanced Common Names
  commonNames: [{
    name: String,
    language: String,
    region: String
  }],
  // Native Range and Distribution
  nativeRange: {
    continents: [String],
    countries: [String],
    regions: [String],
    climateZones: [String],
    altitudinalRange: {
      min: Number,
      max: Number,
      unit: { type: String, default: 'meters' }
    }
  },
  // Conservation Status
  conservation: {
    status: String, // LC, NT, VU, EN, CR, EW, EX
    assessmentDate: Date,
    assessmentAuthority: String, // IUCN, National Red List, etc.
    populationTrend: String, // Increasing, Stable, Decreasing, Unknown
    threats: [String],
    protectedAreas: [String],
    conservationMeasures: [String],
    invasive: Boolean,
    rare: Boolean,
    endangered: Boolean,
    endemic: Boolean
  },
  // Detailed Morphological Characteristics
  morphology: {
    plantType: String, // Tree, Shrub, Herb, Vine, etc.
    lifeForm: String, // Annual, Biennial, Perennial
    size: {
      height: {
        min: Number,
        max: Number,
        unit: { type: String, default: 'cm' }
      },
      spread: {
        min: Number,
        max: Number,
        unit: { type: String, default: 'cm' }
      },
      diameter: {
        min: Number,
        max: Number,
        unit: { type: String, default: 'cm' }
      }
    },
    leaves: {
      type: String, // Simple, Compound, Palmately compound, etc.
      shape: String, // Ovate, Lanceolate, Elliptic, etc.
      margin: String, // Entire, Serrate, Lobed, etc.
      venation: String, // Parallel, Pinnate, Palmate, etc.
      arrangement: String, // Alternate, Opposite, Whorled
      surface: String, // Smooth, Hairy, Waxy, etc.
      color: String,
      size: String,
      texture: String,
      duration: String // Deciduous, Evergreen, Semi-evergreen
    },
    flowers: {
      type: String, // Perfect, Imperfect, Complete, Incomplete
      symmetry: String, // Radial, Bilateral
      inflorescence: String, // Solitary, Cluster, Raceme, etc.
      color: [String],
      size: String,
    bloomTime: String,
      bloomDuration: String,
      fragrance: String,
      pollinators: [String]
    },
    fruits: {
      type: String, // Berry, Drupe, Capsule, etc.
      color: [String],
      size: String,
      edible: Boolean,
      dispersal: String, // Wind, Water, Animal, etc.
      maturityTime: String
    },
    stems: {
      type: String, // Woody, Herbaceous
      color: String,
      texture: String,
      branching: String
    },
    roots: {
      type: String, // Taproot, Fibrous, Adventitious
      depth: String,
      spread: String
    },
    bark: {
      color: String,
      texture: String,
      pattern: String
    }
  },
  // Detailed Cultivation Requirements
  cultivation: {
    hardiness: {
      zones: [String],
      minTemperature: Number,
      maxTemperature: Number,
      temperatureUnit: { type: String, default: 'Celsius' }
    },
    light: {
      requirement: String, // Full sun, Partial shade, Full shade
      dailyHours: String,
      intensity: String
    },
    water: {
      requirement: String, // Low, Moderate, High
      frequency: String,
      method: String,
      drainageNeeds: String,
      droughtTolerance: String,
      floodTolerance: String
    },
    soil: {
      type: [String], // Clay, Sandy, Loamy, etc.
      ph: {
        min: Number,
        max: Number,
        preferred: Number
      },
      drainage: String,
      fertility: String,
      organic_matter: String,
      salinity_tolerance: String
    },
    climate: {
    humidity: String,
      rainfall: {
        annual_min: Number,
        annual_max: Number,
        unit: { type: String, default: 'mm' }
      },
      wind_tolerance: String,
      pollution_tolerance: String
    },
    propagation: {
      methods: [String], // Seed, Cutting, Division, etc.
      best_time: String,
      success_rate: String,
      special_requirements: String
    },
    planting: {
      best_time: String,
      spacing: String,
      depth: String,
      container_suitable: Boolean,
      companion_plants: [String],
      avoid_planting_with: [String]
    }
  },
  // Detailed Maintenance Guidelines
  maintenance: {
    pruning: {
      frequency: String,
      best_time: String,
      techniques: [String],
      tools_needed: [String],
      safety_precautions: [String]
    },
    fertilization: {
      frequency: String,
      type: String,
      npk_ratio: String,
      organic_options: [String],
      application_method: String,
      timing: String
    },
    pest_management: {
      common_pests: [String],
      prevention_methods: [String],
      organic_treatments: [String],
      chemical_treatments: [String],
      beneficial_insects: [String]
    },
    disease_management: {
      common_diseases: [String],
      prevention_methods: [String],
      organic_treatments: [String],
      chemical_treatments: [String],
      environmental_controls: [String]
    },
    seasonal_care: {
      spring: [String],
      summer: [String],
      autumn: [String],
      winter: [String]
    },
    maintenance_level: String, // Low, Moderate, High
    common_problems: [String],
    troubleshooting: [String]
  },
  // Practical Uses and Benefits
  uses: {
    medicinal: {
      traditional_uses: [String],
      active_compounds: [String],
      preparation_methods: [String],
      dosage: String,
      precautions: [String],
      scientific_evidence: String
    },
    culinary: {
      edible_parts: [String],
      preparation_methods: [String],
      nutritional_value: String,
      flavor_profile: String,
      culinary_traditions: [String],
      recipes: [String]
    },
    industrial: {
      applications: [String],
      products: [String],
      processing_methods: [String],
      economic_importance: String
    },
    ornamental: {
      landscape_uses: [String],
      garden_styles: [String],
      seasonal_interest: [String],
      companion_plants: [String],
      design_considerations: [String]
    },
    ecological: {
      wildlife_value: [String],
      pollinator_support: [String],
      soil_benefits: [String],
      erosion_control: Boolean,
      carbon_sequestration: String,
      biodiversity_support: [String]
    },
    cultural: {
      significance: String,
      mythology: String,
      symbolism: String,
      traditional_ceremonies: [String],
      folklore: [String],
      historical_importance: String
    }
  },
  // Interesting Facts and Additional Information
  facts: {
    interesting_facts: [String],
    unique_features: [String],
    evolutionary_adaptations: [String],
    historical_significance: String,
    discovery_story: String,
    nomenclature_origin: String,
    world_records: [String]
  },
  // Environmental Tolerance
  environmentalTolerance: {
    droughtTolerance: String,
    saltTolerance: String,
    frostTolerance: String,
    heatTolerance: String,
    windTolerance: String,
    pollutionTolerance: String,
    floodTolerance: String,
    phMinimum: Number,
    phMaximum: Number
  },
  // Ecological Interactions
  interactions: {
    attracts: [String],
    resistantTo: [String],
    pestSusceptibility: [String],
    symbioticRelationships: [String],
    allelopathy: {
      effects: [String],
      affected_species: [String]
    }
  },
  // Safety Information
  safety: {
    poisonousToHumans: Boolean,
    poisonousToPets: Boolean,
    toxicity_level: String,
    toxic_parts: [String],
    symptoms: [String],
    first_aid: [String],
    skin_irritation: Boolean,
    allergenic_potential: String,
    handling_precautions: [String]
  },
  // Related Species and Varieties
  relatedSpecies: {
    cultivars: [String],
    varieties: [String],
    hybrids: [String],
    close_relatives: [String],
    comparison_notes: [String]
  },
  // Research and References
  research: {
    recent_studies: [String],
    research_gaps: [String],
    conservation_research: [String],
    breeding_programs: [String]
  },
  references: {
    scientific_papers: [String],
    books: [String],
    websites: [String],
    databases: [String],
    expert_contacts: [String]
  }
}, {
  timestamps: true
});

// Create indexes for search functionality
plantSchema.index({ commonName: 'text', scientificName: 'text' });
plantSchema.index({ 'taxonomy.family': 1 });
plantSchema.index({ 'conservation.status': 1 });
plantSchema.index({ 'nativeRange.countries': 1 });

module.exports = mongoose.model('Plant', plantSchema);