import { useState, useCallback } from 'react';
import { POLICE_AGENCIES } from '../data/constants';

const INITIAL_CASE_INFO = {
  caseCause: '',     // 案由
  isWanted: 'false', // 是否為通緝犯 (字串型態以配合 select value)
  suspectName: '',
  officer: '',
  policeAgency: '',
  policeSubAgency: '',
  policeUnit: '',
  unitAddress: ''
};

/**
 * 管理案件基本資料與機關連動邏輯
 */
export const useCaseForm = () => {
  const [caseInfo, setCaseInfo] = useState(INITIAL_CASE_INFO);

  // 通用的欄位更新函式
  const updateField = useCallback((field, value) => {
    setCaseInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  // 處理警察機關變更 -> 自動重置下級單位並帶入地址
  const handleAgencyChange = useCallback((agencyName) => {
    const agency = POLICE_AGENCIES[agencyName];
    let newAddress = '';

    // 若該機關有預設地址 (如總局/大隊部)，先行暫存
    if (agency && agency.addr) {
      newAddress = agency.addr;
    }

    setCaseInfo(prev => ({
      ...prev,
      policeAgency: agencyName,
      policeSubAgency: '', // 重置分局
      unitAddress: newAddress // 自動帶入地址
    }));
  }, []);

  // 處理所屬機關(分局)變更 -> 自動帶入分局地址
  const handleSubAgencyChange = useCallback((subAgencyName) => {
    const agency = POLICE_AGENCIES[caseInfo.policeAgency];
    let newAddress = caseInfo.unitAddress;

    if (agency && agency.subAgencies && agency.subAgencies[subAgencyName]) {
      const sub = agency.subAgencies[subAgencyName];
      if (sub.addr) {
        newAddress = sub.addr;
      }
    }

    setCaseInfo(prev => ({
      ...prev,
      policeSubAgency: subAgencyName,
      unitAddress: newAddress
    }));
  }, [caseInfo.policeAgency, caseInfo.unitAddress]);

  return {
    caseInfo,
    setCaseInfo,
    updateField,
    handleAgencyChange,
    handleSubAgencyChange
  };
};