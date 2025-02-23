import React, { useState } from 'react';
import { Form, Row, Col, Button, InputGroup } from 'react-bootstrap';
import { FaSearch, FaFilter } from 'react-icons/fa';

interface SearchFilters {
  dateFrom?: Date;
  dateTo?: Date;
  fileTypes?: string[];
  tags?: string[];
  isArchived?: boolean;
}

interface DocumentSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  availableTags?: string[];
}

export default function DocumentSearch({ onSearch, availableTags = [] }: DocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fileTypes = [
    'PDF', 'DOC', 'DOCX', 'XLS', 'XLSX',
    'PPT', 'PPTX', 'TXT', 'CSV', 'ZIP'
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, {
      ...filters,
      tags: selectedTags,
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Form onSubmit={handleSearch} className="mb-4">
      <Row className="g-3">
        <Col>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="outline-secondary" onClick={() => setShowFilters(!showFilters)}>
              <FaFilter /> Filters
            </Button>
            <Button type="submit" variant="primary">
              <FaSearch /> Search
            </Button>
          </InputGroup>
        </Col>
      </Row>

      {showFilters && (
        <div className="mt-3 p-3 border rounded bg-light">
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Date Range</Form.Label>
                <Row>
                  <Col>
                    <Form.Control
                      type="date"
                      onChange={(e) => setFilters({
                        ...filters,
                        dateFrom: e.target.value ? new Date(e.target.value) : undefined
                      })}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      type="date"
                      onChange={(e) => setFilters({
                        ...filters,
                        dateTo: e.target.value ? new Date(e.target.value) : undefined
                      })}
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>File Types</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {fileTypes.map(type => (
                    <Form.Check
                      key={type}
                      type="checkbox"
                      label={type}
                      inline
                      onChange={(e) => setFilters({
                        ...filters,
                        fileTypes: e.target.checked
                          ? [...(filters.fileTypes || []), type]
                          : (filters.fileTypes || []).filter(t => t !== type)
                      })}
                    />
                  ))}
                </div>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label>Tags</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <Button
                      key={tag}
                      variant={selectedTags.includes(tag) ? "primary" : "outline-primary"}
                      size="sm"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Check
                type="switch"
                label="Include archived documents"
                onChange={(e) => setFilters({
                  ...filters,
                  isArchived: e.target.checked
                })}
              />
            </Col>
          </Row>
        </div>
      )}
    </Form>
  );
} 