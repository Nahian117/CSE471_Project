/**
 * Predefined campus pickup points for BRAC University.
 * Address: Kha 224, Pragati Sarani, Merul Badda, Dhaka 1212, Bangladesh
 * Centre coordinates: { lat: 23.7725, lng: 90.4254 }
 */
export const BRACU_PICKUP_POINTS = [
  {
    id:      'main-gate',
    name:    'Main Gate',
    address: 'Kha 224, Pragati Sarani, Merul Badda, Dhaka 1212',
    lat:     23.7725,
    lng:     90.4254,
    icon:    '🚪',
    description: 'Primary entrance on Pragati Sarani — always staffed.'
  },
  {
    id:      'library',
    name:    'Library (Ayesha Abed Library)',
    address: 'Ayesha Abed Library, BRAC University, Merul Badda, Dhaka 1212',
    lat:     23.7722,
    lng:     90.4251,
    icon:    '📚',
    description: 'Ground-floor entrance of the library building.'
  },
  {
    id:      'cafeteria',
    name:    'Cafeteria',
    address: 'BRAC University Cafeteria, Merul Badda, Dhaka 1212',
    lat:     23.7728,
    lng:     90.4258,
    icon:    '🍽️',
    description: 'Main student cafeteria — busy during lunch hours.'
  },
  {
    id:      'ub-lobby',
    name:    'UB Lobby (University Building)',
    address: 'BRAC University Building Lobby, Pragati Sarani, Dhaka 1212',
    lat:     23.7727,
    lng:     90.4248,
    icon:    '🏛️',
    description: 'Ground-floor lobby of the main university building.'
  },
  {
    id:      'student-lounge',
    name:    'Student Lounge',
    address: 'BRAC University Student Lounge, Merul Badda, Dhaka 1212',
    lat:     23.7720,
    lng:     90.4256,
    icon:    '🛋️',
    description: 'Common student seating area — safe and monitored.'
  },
  {
    id:      'rooftop-garden',
    name:    'Rooftop Garden',
    address: 'BRAC University Rooftop, Pragati Sarani, Dhaka 1212',
    lat:     23.7730,
    lng:     90.4252,
    icon:    '🌿',
    description: 'Open rooftop area — good for quick handoffs.'
  },
  {
    id:      'back-gate',
    name:    'Back Gate',
    address: 'BRAC University Back Gate, Merul Badda, Dhaka 1212',
    lat:     23.7732,
    lng:     90.4260,
    icon:    '🔙',
    description: 'Secondary campus exit — near the parking area.'
  },
];

/** Exact centre of BRACU campus — Kha 224, Pragati Sarani, Merul Badda, Dhaka 1212 */
export const BRACU_CENTER = { lat: 23.7725, lng: 90.4254 };
export const BRACU_ZOOM   = 18;
