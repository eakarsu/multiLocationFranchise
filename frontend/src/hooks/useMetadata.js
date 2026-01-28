import { useState, useEffect } from 'react';
import { metadataAPI } from '../services/api';

// Cache for metadata to avoid repeated API calls
let cachedEnums = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useMetadata = () => {
  const [enums, setEnums] = useState(cachedEnums || {
    userRoles: [],
    locationStatuses: [],
    auditStatuses: [],
    priorities: [],
    issueStatuses: [],
    paymentStatuses: [],
    ticketStatuses: [],
    contentTypes: [],
    frequencies: []
  });
  const [loading, setLoading] = useState(!cachedEnums);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEnums = async () => {
      const now = Date.now();
      if (cachedEnums && (now - cacheTimestamp) < CACHE_DURATION) {
        setEnums(cachedEnums);
        setLoading(false);
        return;
      }

      try {
        const response = await metadataAPI.getEnums();
        cachedEnums = response.data;
        cacheTimestamp = now;
        setEnums(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch enums:', err);
        setError(err);
        // Use fallback values if API fails
        setEnums({
          userRoles: [
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
            { value: 'CORPORATE_ADMIN', label: 'Corporate Admin' },
            { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
            { value: 'LOCATION_MANAGER', label: 'Location Manager' },
            { value: 'STAFF', label: 'Staff' }
          ],
          locationStatuses: [
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'SUSPENDED', label: 'Suspended' }
          ],
          auditStatuses: [
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' }
          ],
          priorities: [
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' }
          ],
          issueStatuses: [
            { value: 'OPEN', label: 'Open' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' }
          ],
          paymentStatuses: [
            { value: 'PENDING', label: 'Pending' },
            { value: 'PAID', label: 'Paid' },
            { value: 'OVERDUE', label: 'Overdue' },
            { value: 'PARTIAL', label: 'Partial' }
          ],
          ticketStatuses: [
            { value: 'OPEN', label: 'Open' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'WAITING_ON_CUSTOMER', label: 'Waiting on Customer' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' }
          ],
          contentTypes: [
            { value: 'video', label: 'Video' },
            { value: 'document', label: 'Document' },
            { value: 'quiz', label: 'Quiz' },
            { value: 'presentation', label: 'Presentation' },
            { value: 'interactive', label: 'Interactive' }
          ],
          frequencies: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'annually', label: 'Annually' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEnums();
  }, []);

  // Helper to get label for a value
  const getLabel = (enumName, value) => {
    const enumList = enums[enumName] || [];
    const item = enumList.find(e => e.value === value);
    return item ? item.label : value;
  };

  return { enums, loading, error, getLabel };
};

export default useMetadata;
