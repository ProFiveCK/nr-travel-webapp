// Format date as dd/mm/yyyy in Nauru timezone (Pacific/Nauru, UTC+12)
export const formatDateNauru = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Nauru is UTC+12, so we add 12 hours to get local time
    const nauruDate = new Date(date.getTime() + (12 * 60 * 60 * 1000));
    
    const day = nauruDate.getUTCDate().toString().padStart(2, '0');
    const month = (nauruDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = nauruDate.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid date';
  }
};

// Format date and time as dd/mm/yyyy HH:mm in Nauru timezone
export const formatDateTimeNauru = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Nauru is UTC+12, so we add 12 hours to get local time
    const nauruDate = new Date(date.getTime() + (12 * 60 * 60 * 1000));
    
    const day = nauruDate.getUTCDate().toString().padStart(2, '0');
    const month = (nauruDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = nauruDate.getUTCFullYear();
    const hours = nauruDate.getUTCHours().toString().padStart(2, '0');
    const minutes = nauruDate.getUTCMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid date';
  }
};

