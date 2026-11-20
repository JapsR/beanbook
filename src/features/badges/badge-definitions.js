/**
 * Every badge: which fact it counts and the goal for each level.
 */
export const BADGES = [
  {
    id: "stocked", name: "Stocked Up", icon: "box", color: "#1E88E5", key: "coffees", goals: [1], what: "Add your first coffee."
  },
  {
    id: "firstsip", name: "First Sip", icon: "cup", color: "#DE2C4A", key: "brews", goals: [1], what: "Log your first preparation."
  },
  {
    id: "counter", name: "Bean Counter", icon: "bean", color: "#8B5A2B", key: "coffees", goals: [5, 10, 25, 50], what: "Coffees on your shelf.", unit: "coffees"
  },
  {
    id: "grind", name: "Daily Grind", icon: "heart", color: "#E0447C", key: "brews", goals: [10, 25, 50, 100, 250], what: "Preparations logged.", unit: "preparations"
  },
  {
    id: "actor", name: "Method Actor", icon: "layers", color: "#7A4FD6", key: "methods", goals: [3, 5, 8], what: "Different brew methods used.", unit: "methods"
  },
  {
    id: "second", name: "Second Opinion", icon: "swap", color: "#0FA3B1", key: "maxM", goals: [2, 3, 4], what: "Prepare one coffee with different methods.", unit: "methods on one coffee"
  },
  {
    id: "dialed", name: "Dialed In", icon: "target", color: "#F47B20", key: "maxPer", goals: [5, 10, 20], what: "Keep tuning the same coffee.", unit: "preparations of one coffee"
  },
  {
    id: "globe", name: "Globetrotter", icon: "globe", color: "#1F9D6B", key: "origins", goals: [3, 6, 10], what: "Coffees from different origins.", unit: "origins"
  },
  {
    id: "roasters", name: "Roaster Hopper", icon: "pin", color: "#C2410C", key: "roasters", goals: [3, 6, 10], what: "Buy from different roasters.", unit: "roasters"
  },
  {
    id: "godshot", name: "God Shot", icon: "star", color: "#E0A100", key: "five", goals: [1], what: "Rate a preparation a perfect 5."
  },
  {
    id: "sweet", name: "Sweet Spot", icon: "check", color: "#16875A", key: "high", goals: [3, 10, 25], what: "Preparations rated 4.5 or higher.", unit: "top-rated cups"
  },
  {
    id: "honest", name: "Honest Cup", icon: "meh", color: "#5B6B8C", key: "low", goals: [1], what: "Rate a preparation 2 or lower. Not every cup is a winner."
  },
  {
    id: "palate", name: "Palate", icon: "drop", color: "#B02A8F", key: "flavors", goals: [8, 16, 24], what: "Different flavour notes picked.", unit: "flavour notes"
  },
  {
    id: "words", name: "Wordsmith", icon: "pen", color: "#2F6BD9", key: "notes", goals: [5, 20, 50], what: "Preparations with written tasting notes.", unit: "written notes"
  },
  {
    id: "shutter", name: "Shutterbug", icon: "camera", color: "#D6334C", key: "photos", goals: [3, 10, 25], what: "Photos added to coffees and preparations.", unit: "photos"
  },
  {
    id: "early", name: "Early Bird", icon: "sun", color: "#F2A900", key: "early", goals: [1, 5, 20], what: "Brew before 07:00.", unit: "early cups"
  },
  {
    id: "owl", name: "Night Owl", icon: "moon", color: "#3F3D9E", key: "late", goals: [1, 5, 20], what: "Brew after 21:00.", unit: "late cups"
  },
  {
    id: "streak", name: "On a Roll", icon: "flame", color: "#E8541E", key: "streak", goals: [3, 7, 14, 30], what: "Log a preparation on consecutive days.", unit: "days in a row"
  },
  {
    id: "weekend", name: "Weekend Ritual", icon: "cal", color: "#0E8F8F", key: "weekends", goals: [1, 4, 12], what: "Brew on both Saturday and Sunday.", unit: "full weekends"
  },
  {
    id: "fresh", name: "Fresh Roast", icon: "leaf", color: "#3D9A2B", key: "fresh", goals: [1, 5, 15], what: "Brew within 14 days of the roast date.", unit: "fresh cups"
  },
  {
    id: "cold", name: "Cold Snap", icon: "snow", color: "#2B9FD9", key: "cold", goals: [1, 5], what: "Make cold brew.", unit: "cold brews"
  },
  {
    id: "bottom", name: "Bottom of the Bag", icon: "check", color: "#8B5A2B", key: "finished", goals: [1, 5, 15], what: "Finish a bag and mark it done.", unit: "bags finished"
  },
  {
    id: "backup", name: "Safety Net", icon: "shield", color: "#16875A", key: "exports", goals: [1], what: "Export a backup of your data."
  }
];
