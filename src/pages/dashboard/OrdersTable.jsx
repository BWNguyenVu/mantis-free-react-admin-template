import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import AnalyticEcommerce from 'components/cards/statistics/AnalyticEcommerce';
import Dot from 'components/@extended/Dot';

const APIKEYBACKEND= import.meta.env.VITE_APP_BASE_NAME

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

function createData(
  tracking_no,
  campaignName,
  adName,
  budget,
  reach,
  costPerResult,
  results,
  cpm,
  cpc,
  ctr,
  reportingStarts,
  reportingEnds,
  date
) {
  return {
    tracking_no,
    campaignName,
    adName,
    budget,
    reach,
    costPerResult,
    results,
    cpm,
    cpc,
    ctr,
    reportingStarts,
    reportingEnds,
    date,
  };
}

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'campaignName', align: 'left', disablePadding: false, label: 'Campaign Name' },
  { id: 'adName', align: 'left', disablePadding: false, label: 'Ad Name' },
  { id: 'budget', align: 'left', disablePadding: false, label: 'Budget' },
  { id: 'reach', align: 'left', disablePadding: false, label: 'Reach' },
  { id: 'costPerResult', align: 'left', disablePadding: false, label: 'Cost' },
  { id: 'results', align: 'left', disablePadding: false, label: 'Result' },
  { id: 'cpm', align: 'left', disablePadding: false, label: 'CPM' },
  { id: 'cpc', align: 'left', disablePadding: false, label: 'CPC' },
  { id: 'ctr', align: 'left', disablePadding: false, label: 'CTR' },
  { id: 'reportingStarts', align: 'left', disablePadding: false, label: 'Start Date' },
  { id: 'reportingEnds', align: 'left', disablePadding: false, label: 'End Date' },
  { id: 'date', align: 'left', disablePadding: false, label: 'Reporting Date' },
];

function OrderTableHead({ order, orderBy }) {
  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

function OrderStatus({ status }) {
  let color;
  let title;

  switch (status) {
    case 0:
      color = 'warning';
      title = 'Neutral';
      break;
    case 1:
      color = 'success';
      title = 'Good';
      break;
    case 2:
      color = 'error';
      title = 'Bad';
      break;
    default:
      color = 'primary';
      title = 'None';
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Dot color={color} />
      <Typography>{title}</Typography>
    </Stack>
  );
}

const normalize = (value, min, max) => (value - min) / (max - min);

const calculatePerformanceScore = (campaign, minMax) => {
  const reachScore = normalize(campaign.reach, minMax.reach.min, minMax.reach.max);
  const costPerResultScore = 1 - normalize(campaign.costPerResult, minMax.costPerResult.min, minMax.costPerResult.max);
  const cpmScore = 1 - normalize(campaign.cpm, minMax.cpm.min, minMax.cpm.max);
  const cpcScore = 1 - normalize(campaign.cpc, minMax.cpc.min, minMax.cpc.max);
  const ctrScore = normalize(campaign.ctr, minMax.ctr.min, minMax.ctr.max);

  return (reachScore + costPerResultScore + cpmScore + cpcScore + ctrScore) / 5;
};

const getPerformanceCategory = (score) => {
  if (score > 0.62) return 'good';
  if (score > 0.3) return 'average';
  return 'poor';
};

const KEY_LOCAL_STORAGE = 'apiKey'; // Key for storing API key in localStorage

export default function OrderTable() {
  const order = 'asc';
  const orderBy = 'tracking_no';
  const [campaigns, setCampaigns] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState([]);
  const [fanpages, setFanpages] = useState([]);
  const [selectedFanpage, setSelectedFanpage] = useState('');
  const [key, setKey] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(false);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const apiKey = localStorage.getItem(KEY_LOCAL_STORAGE);
    if (apiKey) {
      setKey(apiKey);
      validateKey(apiKey);
    }
  }, []);

  const validateKey = async (apiKey) => {
    try {
      const response = await axios.get(APIKEYBACKEND + '/api/available-dates', {
        headers: { 'Authorization': apiKey }
      });
      setIsKeyValid(true);
      setAvailableDates(response.data);
      setSelectedDate(response.data[0]);
      fetchFanpages(apiKey); // Fetch fanpages after key validation
    } catch (error) {
      console.error('Invalid key:', error);
      setIsKeyValid(false);
      localStorage.removeItem(KEY_LOCAL_STORAGE);
    }
  };

  const fetchFanpages = async (apiKey) => {
    try {
      const response = await axios.get(APIKEYBACKEND + '/api/fanpages', {
        headers: { 'Authorization': apiKey }
      });
      setFanpages(response.data);
      setSelectedFanpage(response.data[0]);
    } catch (error) {
      console.error('Error fetching fanpages:', error);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedFanpage && isKeyValid) {
      fetchData(selectedDate, selectedFanpage);
    }
  }, [selectedDate, selectedFanpage, isKeyValid]);

  const fetchData = async (selectedDate, selectedFanpage) => {
    try {
      const response = await axios.get(APIKEYBACKEND + `/api/campaigns?date=${selectedDate}&fanpage=${selectedFanpage}`, {
        headers: { 'Authorization': key }
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleKeySubmit = async (event) => {
    event.preventDefault();
    validateKey(key);
    localStorage.setItem(KEY_LOCAL_STORAGE, key); 
  };
  // const handleKeySubmit = async (event) => {
  //   event.preventDefault();
  //   // Attempt to validate key by fetching available dates
  //   try {
  //     const response = await axios.get('http://localhost:8088/api/available-dates', {
  //       headers: { 'Authorization': key }
  //     });

  //     setIsKeyValid(true);
  //     setAvailableDates(response.data);
  //     setSelectedDate(response.data[0]);
  //     localStorage.setItem(KEY_LOCAL_STORAGE, key); // Store key in localStorage
  //   } catch (error) {
  //     console.error('Invalid key:', error);
  //     setIsKeyValid(false);
  //     localStorage.removeItem(KEY_LOCAL_STORAGE); // Remove key from
  //   }
  // };

  const metrics = ['reach', 'costPerResult', 'cpm', 'cpc', 'ctr'];
  const minMax = metrics.reduce((acc, metric) => {
    const values = campaigns.map((c) => c[metric]);
    acc[metric] = { min: Math.min(...values), max: Math.max(...values) };
    return acc;
  }, {});

  const rows = campaigns.map((campaign) => {
    const score = calculatePerformanceScore(campaign, minMax);
    const performanceCategory = getPerformanceCategory(score);
    return {
      ...createData(
        campaign._id,
        campaign.campaignName,
        campaign.adName,
        campaign.budget,
        campaign.reach,
        campaign.costPerResult,
        campaign.results,
        campaign.cpm,
        campaign.cpc,
        campaign.ctr,
        formatDate(campaign.reportingStarts),
        formatDate(campaign.reportingEnds),
        formatDate(campaign.date)
      ),
      performanceCategory,
    };
  });

  const totalReach = campaigns.reduce((sum, campaign) => sum + campaign.reach, 0);
  const totalCampaigns = campaigns.length;
  const averageCostPerResult = campaigns.reduce((sum, campaign) => sum + campaign.costPerResult, 0) / totalCampaigns;
  const maxCTR = Math.max(...campaigns.map((c) => c.ctr));

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const handleFanpageChange = (event) => {
    setSelectedFanpage(event.target.value);
  };

  return (
    <Box>
      {!isKeyValid ? (
        <form onSubmit={handleKeySubmit}>
          <label>
            Enter Access Key:
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px', borderRadius: '3px', border: '1px solid #ccc' }}
            />
          </label>
          <button type="submit" style={{ marginLeft: '10px', padding: '5px 10px', borderRadius: '3px', background: '#4caf50', color: 'white', border: 'none', cursor: 'pointer' }}>
            Submit
          </button>
        </form>
      ) : (
        <div>
          <Grid container rowSpacing={4.5} columnSpacing={2.75} sx={{ padding: '20px' }}>
            <Grid item xs={12} sx={{ mb: -2.25 }}>
              <Typography variant="h5">Dashboard</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <AnalyticEcommerce title="Total Reach" count={totalReach.toLocaleString()} percentage={1} extra="null" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <AnalyticEcommerce title="Total Campaign" count={totalCampaigns.toLocaleString()} percentage={1} extra="null" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <AnalyticEcommerce title="Average Cost Per Result" count={averageCostPerResult.toFixed(2)} percentage={1} isLoss color="warning" extra="null" />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <AnalyticEcommerce title="Most CTR" count={maxCTR.toFixed(2)} percentage={1} isLoss color="warning" extra="null" />
            </Grid>
            <Grid item md={8} sx={{ display: { sm: 'none', md: 'block', lg: 'none' } }} />
          </Grid>

          <Grid sx={{ display: 'flex', gap: '10px', marginLeft: '10px', marginTop: '20px' }}>
            <OrderStatus status={1} />
            <OrderStatus status={0} />
            <OrderStatus status={2} />
            <Grid container spacing={2} alignItems="center" sx={{ marginLeft: '20px' }}>
              <Grid item>
                <Typography variant="h6">Select Date:</Typography>
              </Grid>
              <Grid item>
                <select
                  value={selectedDate}
                  onChange={handleDateChange}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minWidth: '120px',
                  }}
                >
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </Grid>
              <Grid item>
                <Typography variant="h6">Select Fanpage:</Typography>
              </Grid>
              <Grid item>
                <select
                  value={selectedFanpage}
                  onChange={handleFanpageChange}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minWidth: '120px',
                  }}
                >
                  {fanpages.map((fanpage) => (
                    <option key={fanpage} value={fanpage}>
                      {fanpage}
                    </option>
                  ))}
                </select>
              </Grid>
              <Grid item>
                <button
                  onClick={() => fetchData(selectedDate, selectedFanpage)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Fetch Data
                </button>
              </Grid>
            </Grid>
          </Grid>

          <TableContainer
            sx={{
              width: '100%',
              overflowX: 'auto',
              position: 'relative',
              display: 'block',
              maxWidth: '100%',
              '& td, & th': { whiteSpace: 'nowrap' },
            }}
          >
            <Table aria-labelledby="tableTitle">
              <OrderTableHead order={order} orderBy={orderBy} />
              <TableBody>
                {stableSort(rows, getComparator(order, orderBy)).map((row, index) => {
                  const labelId = `enhanced-table-checkbox-${index}`;
                  let rowColor;

                  switch (row.performanceCategory) {
                    case 'good':
                      rowColor = 'lightgreen';
                      break;
                    case 'average':
                      rowColor = 'lightyellow';
                      break;
                    case 'poor':
                      rowColor = 'lightcoral';
                      break;
                    default:
                      rowColor = 'white';
                  }

                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      sx={{
                        backgroundColor: rowColor,
                        '&:last-child td, &:last-child th': { border: 0 },
                      }}
                      tabIndex={-1}
                      key={row.tracking_no}
                    >
                      <TableCell>{row.campaignName}</TableCell>
                      <TableCell>{row.adName}</TableCell>
                      <TableCell>{row.budget}</TableCell>
                      <TableCell>{row.reach}</TableCell>
                      <TableCell>{row.costPerResult}</TableCell>
                      <TableCell>{row.results}</TableCell>
                      <TableCell>{row.cpm}</TableCell>
                      <TableCell>{row.cpc}</TableCell>
                      <TableCell>{row.ctr}</TableCell>
                      <TableCell>{row.reportingStarts}</TableCell>
                      <TableCell>{row.reportingEnds}</TableCell>
                      <TableCell>{row.date}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </Box>
  );
}

OrderTableHead.propTypes = {
  order: PropTypes.any,
  orderBy: PropTypes.string,
};

OrderStatus.propTypes = {
  status: PropTypes.number,
};
