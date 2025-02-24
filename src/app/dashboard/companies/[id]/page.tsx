'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Row, Col } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { useParams } from 'next/navigation';
import { FaUsers, FaFileAlt, FaCalendar } from 'react-icons/fa';

interface Company {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    employees: number;
    documents: number;
  };
  employees: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  documents: {
    id: string;
    name: string;
    uploadedBy: {
      name: string;
    };
    createdAt: string;
  }[];
}

export default function CompanyDetailsPage() {
  const params = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await fetch(`/api/companies/${params.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch company details');
        }

        const companyData = await response.json();
        setCompany(companyData);
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load company data');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchCompanyData();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center p-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3 text-muted">Loading company details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout>
        <div className="text-center p-5">
          <h3 className="text-danger mb-4">Error Loading Company</h3>
          <p className="text-muted">{error || 'Company not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-primary fw-bold mb-4">{company.name}</h2>
        
        <Row className="g-4 mb-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                    <FaUsers className="text-primary" size={24} />
                  </div>
                  <div>
                    <h6 className="mb-1">Employees</h6>
                    <h3 className="mb-0">{company._count.employees}</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                    <FaFileAlt className="text-success" size={24} />
                  </div>
                  <div>
                    <h6 className="mb-1">Documents</h6>
                    <h3 className="mb-0">{company._count.documents}</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                    <FaCalendar className="text-info" size={24} />
                  </div>
                  <div>
                    <h6 className="mb-1">Created</h6>
                    <p className="mb-0">{new Date(company.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white border-0 py-3">
            <h5 className="mb-0">Employees</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {company.employees.map(employee => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>
                      <Badge bg={employee.role === 'ADMIN' ? 'primary' : 'secondary'}>
                        {employee.role}
                      </Badge>
                    </td>
                    <td>{new Date(employee.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white border-0 py-3">
            <h5 className="mb-0">Recent Documents</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {company.documents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  company.documents.map(document => (
                    <tr key={document.id}>
                      <td>{document.name}</td>
                      <td>{document.uploadedBy.name}</td>
                      <td>{new Date(document.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>
    </DashboardLayout>
  );
} 