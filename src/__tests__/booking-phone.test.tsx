import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Prevent supabase/address fetch in booking pages by mocking useAuth
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ supabaseUserId: null }) }));

import ECGTestScreen from '@/pages/ECGTestScreen';
import PhysioConsultScreen from '@/pages/PhysioConsultScreen';
import DoctorConsultScreen from '@/pages/DoctorConsultScreen';

describe('Unified Booking screens — Cart workflow verification', () => {
  it('ECGTestScreen renders premium title and doctor options', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/ecg-test' }]}>
        <Routes>
          <Route path="/ecg-test" element={<ECGTestScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/At-Home ECG Test/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Back/i)).toBeInTheDocument();
  });

  it('PhysioConsultScreen renders premium header and therapist list', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/physio-consult' }]}>
        <Routes>
          <Route path="/physio-consult" element={<PhysioConsultScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Expert Physio Care/i)).toBeInTheDocument();
    expect(screen.getByText(/Location Not Covered/i)).toBeInTheDocument();
  });

  it('DoctorConsultScreen renders advanced consultation header and doctor list', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/doctor-consult' }]}>
        <Routes>
          <Route path="/doctor-consult" element={<DoctorConsultScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/How would you like to consult a doctor/i)).toBeInTheDocument();
    expect(screen.getByText(/Visit a Clinic/i)).toBeInTheDocument();
  });
});
