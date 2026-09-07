#!/usr/bin/env python3
"""Hermetic checks for the deterministic MongoDB fixture generator."""

import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "generate_seed.py"
spec = importlib.util.spec_from_file_location("generate_seed", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load {MODULE_PATH}")
generate_seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_seed)


class GenerateSeedTest(unittest.TestCase):
    def test_tiny_fixture_is_deterministic_and_has_expected_collections(self) -> None:
        first = generate_seed.render_mongosh(generate_seed.seed_documents("tiny"))
        second = generate_seed.render_mongosh(generate_seed.seed_documents("tiny"))

        self.assertEqual(first, second)
        self.assertIn('"wide_attributes"', first)
        self.assertIn("EJSON.deserialize(rawDocument)", first)
        self.assertIn("const batchSize = 1_000;", first)
        self.assertIn("collection.bulkWrite(operations, { ordered: false });", first)
        self.assertNotIn("collection.replaceOne({ _id: document._id }, document, { upsert: true });", first)
        self.assertIn("attribute_300", first)

    def test_command_writes_a_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "tiny.js"
            path.write_text(generate_seed.render_mongosh(generate_seed.seed_documents("tiny")), encoding="utf-8")
            self.assertGreater(path.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
