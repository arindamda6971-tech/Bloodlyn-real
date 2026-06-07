import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Prevent supabase/address fetch in booking pages by mocking useAuth
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ supabaseUserId: null }) }));

import ECGBookingScreen from '@/pages/ECGBookingScreen';
import PhysioBookingScreen from '@/pages/PhysioBookingScreen';
import * as ConsultationBookingModule from '@/pages/ConsultationBookingScreen';
const ConsultationBookingScreen = (ConsultationBookingModule as any).default as React.ComponentType<any>;

describe('Booking pages — patient details + preview', () => {
  it('ECGBookingScreen shows patient phone pill and has patient detail inputs', async () => {
    const doctor = {
      id: 'd-1',
      name: 'Dr. Test',
      specialization: 'Cardiology',
      experience: 10,
      rating: 4.9,
      reviews_count: 10,
      fee: 500,
      availability: 'Today',
      qualification: 'MBBS',
    } as any;

    render(
      <MemoryRouter initialEntries={[{ pathname: '/ecg-booking', state: { doctor, patientPhone: '9876543210', patientName: 'Jane Doe', patientAge: 28, patientGender: 'Female' } }]}>
        <Routes>
          <Route path="/ecg-booking" element={<ECGBookingScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // phone pill shown
    expect(await screen.findByText('9876543210')).toBeInTheDocument();

    // inputs present
    expect(screen.getByLabelText(/Patient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Patient age/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient details/i)).toBeInTheDocument();

    // inputs initialized with passed patient info
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('28')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
  });

  it('PhysioBookingScreen shows patient pill and patient detail inputs/preview', async () => {
    const physio = {
      id: 'p-1',
      name: 'Physio Test',
      specialty: 'Rehab',
      experience: '5 years',
      fee: 400,
    } as any;

    render(
      <MemoryRouter initialEntries={[{ pathname: '/physio-booking', state: { physio, patientPhone: '9998887776', patientName: 'Sam', patientAge: 45, patientGender: 'Male' } }]}>
        <Routes>
          <Route path="/physio-booking" element={<PhysioBookingScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('9998887776')).toBeInTheDocument();
    expect(screen.getByLabelText(/Patient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Patient age/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient details/i)).toBeInTheDocument();

    expect(screen.getByDisplayValue('Sam')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
  });

  it('ConsultationBookingScreen shows patient detail inputs and preview (audio mode still supports phone)', async () => {
    const professional = {
      id: 1,
      name: 'Dr. Audio',
      specialty: 'General',
      image: 'https://example.com/avatar.jpg',
      audioCallFee: 199,
    } as any;

    render(
      <MemoryRouter initialEntries={[{ pathname: '/consultation-booking', state: { type: 'audio', professional, professionalType: 'doctor', patientName: 'Maya', patientAge: 31, patientGender: 'Female' } }]}>
        <Routes>
          <Route path="/consultation-booking" element={<ConsultationBookingScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // inputs present
    expect(await screen.findByLabelText(/Patient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Patient age/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient details/i)).toBeInTheDocument();

    // preview shows patient info
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText(/Age: 31/)).toBeInTheDocument();
    expect(screen.getByText(/Gender: Female/)).toBeInTheDocument();

    // audio phone input still works
    const user = userEvent.setup();
    const phoneInput = await screen.findByLabelText(/Phone number to call/i);
    await user.type(phoneInput, '9123456780');
    expect(screen.getByText('9123456780')).toBeInTheDocument();
  });
});
