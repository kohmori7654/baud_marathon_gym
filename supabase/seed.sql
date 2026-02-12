-- Insert test questions to verify auto-increment ID
INSERT INTO questions (exam_type, domain, question_text, question_type, hash, explanation)
VALUES
  ('ENCOR', 'Architecture', 'ENCOR Test Q1', 'Single', 'hash_encor_1', 'Explanation 1'),
  ('ENCOR', 'Virtualization', 'ENCOR Test Q2', 'Multi', 'hash_encor_2', 'Explanation 2'),
  ('ENCOR', 'Infrastructure', 'ENCOR Test Q3', 'DragDrop', 'hash_encor_3', 'Explanation 3');

INSERT INTO questions (exam_type, domain, question_text, question_type, hash, explanation)
VALUES
  ('ENARSI', 'Layer 3 Technologies', 'ENARSI Test Q1', 'Single', 'hash_enarsi_1', 'Explanation 1'),
  ('ENARSI', 'VPN Technologies', 'ENARSI Test Q2', 'Multi', 'hash_enarsi_2', 'Explanation 2'),
  ('ENARSI', 'Infrastructure Security', 'ENARSI Test Q3', 'Simulation', 'hash_enarsi_3', 'Explanation 3');

-- Check result
SELECT id, exam_type, display_id FROM questions ORDER BY created_at;
