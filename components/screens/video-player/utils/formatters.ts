/**
 * Utility functions for formatting dates and other display values
 */

/**
 * Formats a date string for display
 */
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Gets the appropriate color for a recording status
 */
export const getStatusColor = (status: string) => {
  switch (status) {
    case "ready":
      return "#4CAF50"; // Green
    case "processing":
      return "#FF9800"; // Orange
    case "failed":
      return "#F44336"; // Red
    default:
      return "#9E9E9E"; // Grey
  }
};